import { useEffect, useRef } from 'preact/hooks'
import { Chart } from 'chart.js/auto'

// highlights: optional booleans per point - PR sessions drawn larger in green.
export function ProgressChart({ labels, data, highlights = [], label = 'Estimated 1RM (kg)' }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            borderColor: '#d6402f',
            backgroundColor: '#d6402f',
            pointBackgroundColor: data.map((_, i) => (highlights[i] ? '#4ca771' : '#d6402f')),
            pointBorderColor: data.map((_, i) => (highlights[i] ? '#4ca771' : '#d6402f')),
            pointRadius: data.map((_, i) => (highlights[i] ? 6 : 4)),
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#96948c' }, grid: { color: '#34363a' } },
          y: { ticks: { color: '#96948c' }, grid: { color: '#34363a' } },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [labels, data, highlights, label])

  return (
    <div class="progress-chart">
      <canvas ref={canvasRef} />
    </div>
  )
}
