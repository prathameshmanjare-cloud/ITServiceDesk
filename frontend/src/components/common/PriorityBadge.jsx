const config = {
  critical: { color: '#C62828', bg: '#FFEBEE' },
  high: { color: '#F57C00', bg: '#FFF3E0' },
  medium: { color: '#1976D2', bg: '#E3F2FD' },
  low: { color: '#2E7D32', bg: '#E8F5E9' },
};

export function PriorityBadge({ priority }) {
  const c = config[priority] || config.low;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: c.color,
      background: c.bg,
      textTransform: 'capitalize',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
      {priority}
    </span>
  );
}
