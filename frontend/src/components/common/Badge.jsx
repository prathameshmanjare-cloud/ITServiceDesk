export function Badge({ children, color = '#546E7A', bg = '#ECEFF1' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      color,
      background: bg,
    }}>
      {children}
    </span>
  );
}
