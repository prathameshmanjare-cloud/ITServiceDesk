import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Clock, User, Calendar, Lock, Download, MessageSquare, Activity } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Modal } from '../components/common/Modal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

function timelineIcon(status) {
  const icons = {
    open: '🔵', in_progress: '🟠', pending: '🟣', resolved: '🟢', closed: '⚪',
  };
  return icons[status] || '⚪';
}

export function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAssign, setShowAssign] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => client.get(`/api/tickets/${id}`).then(r => r.data.data),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: () => client.get(`/api/tickets/${id}/comments`).then(r => r.data.data),
  });

  const { data: historyData } = useQuery({
    queryKey: ['ticket-history', id],
    queryFn: () => client.get(`/api/tickets/${id}/history`).then(r => r.data.data),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => client.get('/api/users', { params: { role: 'agent', page_size: 100 } }).then(r => r.data.data),
    enabled: user?.role === 'admin',
  });

  const commentMutation = useMutation({
    mutationFn: (data) => client.post(`/api/tickets/${id}/comments`, data),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries(['ticket-comments', id]);
      queryClient.invalidateQueries(['ticket', id]);
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const statusMutation = useMutation({
    mutationFn: (data) => client.put(`/api/tickets/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id]);
      queryClient.invalidateQueries(['ticket-history', id]);
      setShowStatus(false);
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => client.post(`/api/tickets/${id}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id]);
      setShowAssign(false);
      toast.success('Ticket assigned');
    },
    onError: () => toast.error('Failed to assign'),
  });

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  const ticket = ticketData;
  const comments = commentsData || [];
  const history = historyData || [];

  const filteredComments = activeTab === 'internal'
    ? comments.filter(c => c.is_internal)
    : activeTab === 'comments'
      ? comments.filter(c => !c.is_internal)
      : comments;

  const slaPercent = ticket?.due_date ? Math.min(100, (
    (new Date() - new Date(ticket.created_at)) / (new Date(ticket.due_date) - new Date(ticket.created_at)) * 100
  )) : 0;

  const slaColor = slaPercent < 50 ? 'var(--success)' : slaPercent < 80 ? 'var(--warning)' : 'var(--error)';

  const statusActions = {
    open: ['in_progress', 'resolved'],
    in_progress: ['pending', 'resolved'],
    pending: ['in_progress'],
    resolved: ['closed'],
    closed: [],
  };

  if (!ticket) return null;

  return (
    <div>
      <button onClick={() => navigate('/tickets')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Tickets
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 24, alignItems: 'start' }}>
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{ticket.ticket_number}</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>{ticket.title}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--background)', textTransform: 'capitalize' }}>{ticket.category}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Description</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
            </div>

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Attachments</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ticket.attachments.map((att, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--background)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      <Download size={14} /> {att}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', gap: 16, borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
                {[
                  { key: 'all', label: 'All Activity', icon: Activity },
                  { key: 'comments', label: 'Comments', icon: MessageSquare },
                  ...(user?.role !== 'user' ? [{ key: 'internal', label: 'Internal Notes', icon: Lock }] : []),
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', border: 'none', background: 'none',
                      borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                      color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: activeTab === tab.key ? 600 : 400,
                      fontSize: 14, cursor: 'pointer', marginBottom: -2,
                    }}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredComments.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', gap: 12, padding: 16, marginBottom: 12,
                  background: c.is_internal ? '#FFFDE7' : 'var(--surface)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: c.is_internal ? '#F57F17' : 'var(--primary)',
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0,
                  }}>
                    {c.user_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user_name}</span>
                      {c.is_internal && (
                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#F57C00' }}>
                          <Lock size={10} style={{ display: 'inline' }} /> Internal
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{c.content}</p>
                  </div>
                </div>
              ))}

              {(activeTab === 'internal' && filteredComments.length === 0) && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No internal notes</p>
              )}

              <div style={{ marginTop: 16 }}>
                <textarea
                  className="input"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  {user?.role !== 'user' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                      <Lock size={14} /> Internal note
                    </label>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!comment.trim()}
                    onClick={() => commentMutation.mutate({ content: comment, is_internal: isInternal })}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Send size={16} /> Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 88 }}>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Details</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusBadge status={ticket.status} />
                {user?.role !== 'user' && (
                  <button className="btn btn-sm btn-secondary" onClick={() => { setNewStatus(ticket.status); setShowStatus(true); }} style={{ fontSize: 11, padding: '2px 8px' }}>
                    Change
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Priority</span><PriorityBadge priority={ticket.priority} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Category</span><span style={{ textTransform: 'capitalize' }}>{ticket.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Department</span><span>{ticket.department || '-'}</span>
            </div>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>People</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                C
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Created by (ID: {ticket.created_by})</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--warning)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                A
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {ticket.assigned_to ? `Agent #${ticket.assigned_to}` : 'Unassigned'}
                </div>
              </div>
              {user?.role === 'admin' && (
                <button className="btn btn-sm btn-secondary" onClick={() => setShowAssign(true)}>Assign</button>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dates</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Created</span>
              <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Updated</span>
              <span>{ticket.updated_at ? formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true }) : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Due</span>
              <span style={{ color: ticket.due_date && new Date(ticket.due_date) < new Date() ? 'var(--error)' : 'var(--text-primary)' }}>
                {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : '-'}
              </span>
            </div>
            {ticket.resolved_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Resolved</span>
                <span>{new Date(ticket.resolved_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {ticket.due_date && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>SLA Status</h4>
              <div style={{ height: 8, background: 'var(--background)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${slaPercent}%`, height: '100%', background: slaColor, borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>{Math.round(slaPercent)}% elapsed</span>
                <span>{ticket.due_date ? formatDistanceToNow(new Date(ticket.due_date), { addSuffix: true }) : ''}</span>
              </div>
            </div>
          )}

          {user?.role !== 'user' && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(statusActions[ticket.status] || []).map((s) => (
                  <button
                    key={s}
                    className="btn btn-sm"
                    style={{ background: s === 'resolved' ? 'var(--success)' : s === 'closed' ? '#546E7A' : 'var(--primary)', color: 'white' }}
                    onClick={() => statusMutation.mutate({ status: s })}
                  >
                    Mark {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Timeline</h4>
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                {history.map((h, i) => (
                  <div key={h.id} style={{ position: 'relative', paddingBottom: 16, paddingLeft: 16, borderLeft: i < history.length - 1 ? '2px solid var(--border)' : 'none' }}>
                    <div style={{ position: 'absolute', left: -7, top: 0, fontSize: 14 }}>{timelineIcon(h.to_status)}</div>
                    <div style={{ fontSize: 13 }}><strong>{h.changed_by_name}</strong> changed to <StatusBadge status={h.to_status} /></div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {h.created_at ? formatDistanceToNow(new Date(h.created_at), { addSuffix: true }) : ''}
                    </div>
                    {h.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>"{h.note}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Assign Agent">
        <div style={{ marginBottom: 16 }}>
          <label className="label">Select Agent</label>
          <select className="input" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
            <option value="">Choose an agent...</option>
            {(agentsData?.items || []).map((a) => (
              <option key={a.id} value={a.id}>{a.full_name} ({a.department || 'No dept'})</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={!selectedAgent} onClick={() => assignMutation.mutate({ agent_id: parseInt(selectedAgent) })}>
            Assign
          </button>
        </div>
      </Modal>

      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title="Change Status">
        <div style={{ marginBottom: 16 }}>
          <label className="label">New Status</label>
          <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
            {['open', 'in_progress', 'pending', 'resolved', 'closed'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowStatus(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={newStatus === ticket.status} onClick={() => statusMutation.mutate({ status: newStatus })}>
            Update
          </button>
        </div>
      </Modal>
    </div>
  );
}
