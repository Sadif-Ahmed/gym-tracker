// The ⠿ grip for useDragReorder lists. handleProps comes from
// useDragReorder().handleProps(index); arrow keys also move the item.
export function DragHandle({ label, handleProps }) {
  return (
    <button type="button" class="drag-handle" aria-label={`Reorder ${label}: drag, or use the arrow keys`} {...handleProps}>
      ⠿
    </button>
  )
}
