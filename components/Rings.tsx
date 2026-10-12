// Three concentric rings: calories eaten (of budget), protein (of goal), movement burned.
type Ring = { pct: number; color: string };

export default function Rings({ rings, size = 168, children }: { rings: Ring[]; size?: number; children?: React.ReactNode }) {
  const stroke = size * 0.085;
  const gap = stroke * 0.35;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" className="-rotate-90">
        {rings.map((r, i) => {
          const radius = size / 2 - stroke / 2 - i * (stroke + gap);
          const c = 2 * Math.PI * radius;
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={r.color} strokeOpacity={0.15} strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - Math.max(0.001, Math.min(1, r.pct)))}
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
              />
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
