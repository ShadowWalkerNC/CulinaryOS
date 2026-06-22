interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

export function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div className="card">
      <p className="text-[#666666] text-xs font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-3xl font-black mt-1" style={{ color: accent ?? '#ffffff' }}>{value}</p>
      {sub && <p className="text-[#555555] text-xs mt-1">{sub}</p>}
    </div>
  );
}
