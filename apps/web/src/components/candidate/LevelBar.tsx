export function LevelBar({
  level,
  label,
  active = false,
}: {
  level: number;
  label: string;
  active?: boolean;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, level)) * 100);
  return (
    <div
      className={`level${active ? ' level--active' : ''}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="level__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
