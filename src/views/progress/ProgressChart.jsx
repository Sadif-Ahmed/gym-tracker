import { useEffect, useRef } from 'preact/hooks'
import { Chart } from 'chart.js/auto'

export function ProgressChart({ labels, data, label = 'Estimated 1RM (kg)' }) {
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
            pointBackgroundColor: '#d6402f',
            pointRadius: 4,
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
  }, [labels, data, label])

  return (
    <div class="progress-chart">
      <canvas ref={canvasRef} />
    </div>
  )
}
