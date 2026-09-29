import type { Dict } from "@/lib/i18n";
import { displayStreak, type Stats } from "@/lib/stats";

/** Stats for one mode. Empty state is a line of guidance, not a wall of zeros. */
export function StatsBlock({
  stats,
  today,
  d,
  highlight,
}: {
  stats: Stats;
  today: number;
  d: Dict;
  /** Distribution bucket to highlight (today's winning row), if any. */
  highlight?: number;
}) {
  if (stats.played === 0) {
    return (
      <div className="rounded-tile border-2 border-dashed border-limestone-400 px-4 py-5 text-center">
        <p className="font-bold">{d.emptyStats}</p>
        <p className="mt-1 text-sm text-ink-soft">{d.emptyStatsBody}</p>
      </div>
    );
  }

  const winPct = Math.round((stats.won / stats.played) * 100);
  const max = Math.max(1, ...stats.distribution);
  const cells: [string, number][] = [
    [d.played, stats.played],
    [d.winPct, winPct],
    [d.streak, displayStreak(stats, today)],
    [d.maxStreak, stats.maxStreak],
  ];

  return (
    <div>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {cells.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse justify-end">
            <dt className="text-xs leading-tight text-ink-soft">{label}</dt>
            <dd className="text-3xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mb-2 mt-5 text-sm font-bold">{d.distribution}</h3>
      <ol className="space-y-1">
        {stats.distribution.map((n, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 font-bold tabular-nums">{i + 1}</span>
            <span className="flex-1">
              <span
                className={`flex h-6 min-w-7 items-center justify-end rounded-tile px-2 font-bold tabular-nums ${
                  highlight === i ? "bg-tile-correct text-tile-correct-fg" : "bg-tile-absent text-tile-absent-fg"
                }`}
                style={{ width: `${Math.max(8, (n / max) * 100)}%` }}
              >
                {n}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
