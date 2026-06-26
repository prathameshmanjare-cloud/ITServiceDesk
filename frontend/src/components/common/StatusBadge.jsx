const config = {
  open: { color: '#1976D2', bg: '#E3F2FD' },
  in_progress: { color: '#F57C00', bg: '#FFF3E0' },
  pending: { color: '#7B1FA2', bg: '#F3E5F5' },
  resolved: { color: '#2E7D32', bg: '#E8F5E9' },
  closed: { color: '#546E7A', bg: '#ECEFF1' },
};

export function StatusBadge({ status }) {
  const c = config[status] || config.closed;
  const label = status?.replace('_', ' ') || 'Unknown';
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
      {label}
    </span>
  );
}
