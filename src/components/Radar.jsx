export default function Radar({ data, color = '#f5d061', size = 200 }) {
  const c = size / 2
  const R = size / 2 - 30
  const n = data.length
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]
  }
  const poly = data.map((d, i) => pt(i, Math.max(0.06, d.value)).join(',')).join(' ')
  const grid = { fill: 'none', stroke: '#3a352b', strokeWidth: 1 }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[220px]" role="img" aria-label="Radar de desempenho relativo ao torneio">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={data.map((_, i) => pt(i, r).join(',')).join(' ')} {...grid} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} {...grid} />
      })}
      <polygon points={poly} fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2" />
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.22)
        return (
          <text key={d.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#9a917f" fontSize="9" fontWeight="700">
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}
