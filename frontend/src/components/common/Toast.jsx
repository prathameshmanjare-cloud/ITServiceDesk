import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: { border: '#2E7D32', bg: '#E8F5E9', text: '#1B5E20' },
  error: { border: '#C62828', bg: '#FFEBEE', text: '#B71C1C' },
  warning: { border: '#F57C00', bg: '#FFF3E0', text: '#E65100' },
  info: { border: '#0288D1', bg: '#E3F2FD', text: '#01579B' },
};

export function Toast({ id, message, type = 'info', onDismiss, duration = 4000 }) {
  const Icon = icons[type];
  const color = colors[type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)',
      minWidth: 320,
      marginBottom: 8,
    }}>
      <Icon size={20} color={color.border} />
      <span style={{ flex: 1, fontSize: 14, color: color.text }}>{message}</span>
      <button className="btn-icon" onClick={() => onDismiss(id)} style={{ padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
