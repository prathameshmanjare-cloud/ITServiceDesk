export function Skeleton({ width = '100%', height = 16, style }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, ...style }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <Skeleton height={14} width={120} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} height={14} width={`${60 + Math.random() * 30}%`} style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <Skeleton height={14} width={80} style={{ marginBottom: 12 }} />
          <Skeleton height={24} width={120} style={{ marginBottom: 8 }} />
          <Skeleton height={12} width={100} />
        </div>
      ))}
    </div>
  );
}
