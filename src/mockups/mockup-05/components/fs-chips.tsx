// Filesystem health chip + colour thresholds, shared by Filesystems pages.
export function FSHealthChip({ health, large }: { health: string; large?: boolean }) {
  const cls = health === 'Healthy' ? 'green' : health === 'Degraded' ? 'amber' : health === 'Critical' ? 'red' : 'grey'
  return <span className={`aws5-chip aws5-chip--${cls}${large ? ' fs-chip-lg' : ''}`}><span className="a5-dot" />{health}</span>
}

export function pressureBarKind(pct: number): 'blue' | 'amber' | 'red' {
  return pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'blue'
}
