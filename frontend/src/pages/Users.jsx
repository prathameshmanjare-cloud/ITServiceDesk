import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, ToggleLeft, ToggleRight, Eye, X } from 'lucide-react';
import client from '../api/client';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/Skeleton';
import toast from 'react-hot-toast';

export function Users() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showEditRole, setShowEditRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', full_name: '', password: 'Welcome@123', role: 'user', department: '' });
  const [newRole, setNewRole] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, role],
    queryFn: () => client.get('/api/users', { params: { search, role, page_size: 100 } }).then(r => r.data.data),
  });

  const { data: userTickets } = useQuery({
    queryKey: ['user-tickets', selectedUser],
    queryFn: () => client.get(`/api/users/${selectedUser}/tickets`).then(r => r.data.data),
    enabled: !!selectedUser,
  });

  const inviteMutation = useMutation({
    mutationFn: () => client.post('/api/users/invite', inviteData),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowInvite(false);
      setInviteData({ email: '', full_name: '', password: 'Welcome@123', role: 'user', department: '' });
      toast.success('User invited');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to invite'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => client.put(`/api/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowEditRole(null);
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update role'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => client.put(`/api/users/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User status toggled');
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Users</h2>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={18} /> Invite User
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 120 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="user">User</option>
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={6} /> : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Tickets</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((u) => (
                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedUser(u.id)}>
                  <td>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                      {u.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                      background: u.role === 'admin' ? 'var(--error-bg)' : u.role === 'agent' ? 'var(--warning-bg)' : 'var(--primary-bg)',
                      color: u.role === 'admin' ? 'var(--error)' : u.role === 'agent' ? 'var(--warning)' : 'var(--primary)',
                      textTransform: 'capitalize',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{u.department || '-'}</td>
                  <td style={{ fontSize: 13 }}>{u.tickets_assigned || 0}</td>
                  <td>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(u.id); }}>
                      {u.is_active ? <ToggleRight size={18} color="var(--success)" /> : <ToggleLeft size={18} color="var(--error)" />}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); setShowEditRole(u.id); setNewRole(u.role); }} style={{ fontSize: 12 }}>
                        Edit Role
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <div className="card" style={{
          position: 'fixed', right: 0, top: 64, width: 400, height: 'calc(100vh - 64px)',
          zIndex: 90, overflow: 'auto', padding: 24, borderLeft: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>User Details</h3>
            <button className="btn-icon" onClick={() => setSelectedUser(null)}><X size={18} /></button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Recent Tickets</p>
          {(userTickets || []).map((t) => (
            <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <strong>{t.ticket_number}</strong> - {t.title}
            </div>
          ))}
          {userTickets?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tickets</p>}
        </div>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite User">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={inviteData.full_name} onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={inviteData.role} onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}>
              <option value="user">User</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" value={inviteData.department} onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <input className="input" value={inviteData.password} onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => inviteMutation.mutate()}>Invite</button>
        </div>
      </Modal>

      <Modal isOpen={!!showEditRole} onClose={() => setShowEditRole(null)} title="Edit Role">
        <div style={{ marginBottom: 16 }}>
          <label className="label">New Role</label>
          <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="user">User</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowEditRole(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => roleMutation.mutate({ id: showEditRole, role: newRole })}>Update</button>
        </div>
      </Modal>
    </div>
  );
}
