import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Eye, ChevronLeft, ChevronRight, X, LayoutList, LayoutGrid } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { TableSkeleton } from '../components/common/Skeleton';
import { formatDistanceToNow } from 'date-fns';

const statuses = ['', 'open', 'in_progress', 'pending', 'resolved', 'closed'];
const priorities = ['', 'critical', 'high', 'medium', 'low'];
const categories = ['', 'hardware', 'software', 'network', 'access', 'email', 'printer', 'security', 'other'];

export function Tickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('table');
  const pageSize = 20;

  const filters = { status, priority, category, search, page, page_size: pageSize };
  const activeFilters = Object.entries({ status, priority, category }).filter(([_, v]) => v);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => client.get('/api/tickets', { params: { ...filters, sort_by: 'created_at', sort_order: 'desc' } })
      .then(r => r.data.data),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Tickets</h2>
          {data && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, data.total)} of {data.total} tickets
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/create-ticket')}>
          <Plus size={18} /> Create Ticket
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: 120 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {statuses.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: 120 }} value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">All Priority</option>
            {priorities.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: 120 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn-icon ${view === 'table' ? 'btn-primary' : ''}`} onClick={() => setView('table')}><LayoutList size={18} /></button>
            <button className={`btn-icon ${view === 'card' ? 'btn-primary' : ''}`} onClick={() => setView('card')}><LayoutGrid size={18} /></button>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {activeFilters.map(([key, val]) => (
              <span key={key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', background: 'var(--primary-bg)',
                borderRadius: 20, fontSize: 12, color: 'var(--primary)',
              }}>
                {key}: {val}
                <X size={14} style={{ cursor: 'pointer' }} onClick={() => {
                  if (key === 'status') setStatus('');
                  if (key === 'priority') setPriority('');
                  if (key === 'category') setCategory('');
                }} />
              </span>
            ))}
          </div>
        )}
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={8} /> : (
        <>
          {view === 'table' ? (
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items || []).map((ticket) => (
                    <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} style={{ cursor: 'pointer' }}>
                      <td><span style={{ fontWeight: 600, fontSize: 13 }}>{ticket.ticket_number}</span></td>
                      <td style={{ maxWidth: 250 }} className="truncate">{ticket.title}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{ticket.category}</td>
                      <td><PriorityBadge priority={ticket.priority} /></td>
                      <td><StatusBadge status={ticket.status} /></td>
                      <td style={{ fontSize: 13 }}>{ticket.assigned_to ? `Agent #${ticket.assigned_to}` : 'Unassigned'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {ticket.created_at ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }) : '-'}
                      </td>
                      <td style={{ fontSize: 12, color: ticket.due_date && new Date(ticket.due_date) < new Date() ? 'var(--error)' : 'var(--text-secondary)' }}>
                        {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${ticket.id}`); }}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data?.items?.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No tickets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {(data?.items || []).map((ticket) => (
                <div key={ticket.id} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{ticket.ticket_number}</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 14 }} className="truncate">{ticket.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <StatusBadge status={ticket.status} />
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'var(--background)', textTransform: 'capitalize' }}>{ticket.category}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {ticket.created_at ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }) : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.total_pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              {Array.from({ length: Math.min(data.total_pages, 5) }, (_, i) => {
                let p = i + 1;
                if (data.total_pages > 5) {
                  const start = Math.max(1, page - 2);
                  p = start + i;
                  if (p > data.total_pages) return null;
                }
                return (
                  <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button className="btn btn-sm btn-secondary" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
