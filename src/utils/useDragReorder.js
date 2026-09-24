import { useEffect, useRef, useState } from 'preact/hooks'

const EDGE_PX = 80 // auto-scroll when the pointer is this close to the top/bottom
const SCROLL_STEP_PX = 14

// Drag-to-reorder for a vertical list, on pointer events so it works with
// touch as well as a mouse (HTML5 drag-and-drop doesn't fire on phones).
//
// While dragging, nothing is re-rendered into a new order: the dragged item
// follows the pointer and its neighbours slide aside with transforms. The
// DOM order only changes once, in onDrop(from, to) - moving nodes mid-drag
// would drop the pointer capture on the handle.
//
// Usage: give each item ref={itemRef(i)} and style={itemStyle(i)}, and put
// {...handleProps(i)} on its drag handle (which needs touch-action: none).
export function useDragReorder(count, onDrop) {
  const [drag, setDrag] = useState(null) // { from, to, dy, shift }
  const items = useRef([])
  const state = useRef(null)
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function measure() {
    return items.current.slice(0, count).map((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top + window.scrollY, height: rect.height }
    })
  }

  function update() {
    const s = state.current
    if (!s) return
    const dy = s.pointerY + window.scrollY - s.startY
    const dragged = s.rects[s.from]
    // Leading edge decides: the top edge passing a card's middle when moving
    // up, the bottom edge when moving down. Using the dragged card's centre
    // instead would make a tall card hard to move past a short one.
    const top = dragged.top + dy
    const bottom = top + dragged.height
    let to = s.from
    s.rects.forEach((rect, i) => {
      const mid = rect.top + rect.height / 2
      if (i < s.from && top < mid) to = Math.min(to, i)
      if (i > s.from && bottom > mid) to = Math.max(to, i)
    })
    s.to = to
    setDrag({ from: s.from, to, dy, shift: s.shift })
  }

  function tick() {
    const s = state.current
    if (!s) return
    if (s.pointerY < EDGE_PX) window.scrollBy(0, -SCROLL_STEP_PX)
    else if (s.pointerY > window.innerHeight - EDGE_PX) window.scrollBy(0, SCROLL_STEP_PX)
    update()
    frame.current = requestAnimationFrame(tick)
  }

  function finish(commit) {
    const s = state.current
    state.current = null
    cancelAnimationFrame(frame.current)
    setDrag(null)
    if (commit && s && s.to !== s.from) onDrop(s.from, s.to)
  }

  function handleProps(index) {
    return {
      onPointerDown(event) {
        if (event.button !== 0 || count < 2) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        const rects = measure()
        // Neighbours slide by the dragged item's height plus whatever gap
        // separates consecutive items.
        const next = rects[index + 1] ?? rects[index - 1]
        const gap = next
          ? Math.abs(next.top - rects[index].top) - (next.top > rects[index].top ? rects[index].height : next.height)
          : 0
        state.current = {
          from: index,
          to: index,
          startY: event.clientY + window.scrollY,
          pointerY: event.clientY,
          rects,
          shift: rects[index].height + gap,
        }
        setDrag({ from: index, to: index, dy: 0, shift: state.current.shift })
        frame.current = requestAnimationFrame(tick)
      },
      onPointerMove(event) {
        if (state.current) state.current.pointerY = event.clientY
      },
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
      onKeyDown(event) {
        if (event.key === 'ArrowUp' && index > 0) onDrop(index, index - 1)
        else if (event.key === 'ArrowDown' && index < count - 1) onDrop(index, index + 1)
        else return
        event.preventDefault()
      },
    }
  }

  function itemRef(index) {
    return (el) => {
      items.current[index] = el
    }
  }

  function itemStyle(index) {
    if (!drag) return undefined
    const { from, to, dy, shift } = drag
    if (index === from) {
      return { transform: `translateY(${dy}px)`, position: 'relative', zIndex: 5 }
    }
    let offset = 0
    if (from < to && index > from && index <= to) offset = -shift
    if (from > to && index >= to && index < from) offset = shift
    return { transform: `translateY(${offset}px)`, transition: 'transform 150ms ease' }
  }

  return { draggingIndex: drag?.from ?? null, handleProps, itemRef, itemStyle }
}

// Returns a copy of list with the item at `from` moved to `to`.
export function moveItem(list, from, to) {
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
