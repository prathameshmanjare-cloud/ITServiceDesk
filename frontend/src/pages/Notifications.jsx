import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Bell } from 'lucide-react';
import client from '../api/client';
import { TableSkeleton } from '../components/common/Skeleton';
import { formatDistanceToNow } from 'date-fns';

const typeIcons = {
  ticket_created: '🎫',
  ticket_assigned: '📋',
  status_changed: '🔄',
  comment_added: '💬',
  sla_breach: '⚠️',
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => client.get('/api/notifications').then(r => r.data.data),
  });

  const markRead = useMutation({
    mutationFn: (id) => client.put(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllRead = useMutation({
    mutationFn: () => client.put('/api/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  if (isLoading) return <TableSkeleton rows={5} cols={3} />;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Notifications</h2>
        <button className="btn btn-sm btn-secondary" onClick={() => markAllRead.mutate()}>
          <CheckCheck size={16} /> Mark All Read
        </button>
      </div>

      <div className="card">
        {(data?.items || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p>No notifications</p>
          </div>
        ) : (
          (data?.items || []).map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
                if (!n.is_read) markRead.mutate(n.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                background: n.is_read ? 'transparent' : 'var(--primary-bg)',
                cursor: n.ticket_id ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontSize: 20 }}>{typeIcons[n.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                </div>
              </div>
              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
