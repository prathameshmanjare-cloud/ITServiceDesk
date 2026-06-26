import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, Save } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export function Profile() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: tickets } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => client.get('/api/tickets', { params: { page_size: 10 } }).then(r => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => client.put('/api/auth/me', data),
    onSuccess: (res) => {
      updateUser(res.data.data);
      toast.success('Profile updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update profile'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { full_name: fullName, department };
    if (currentPassword && newPassword) {
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      data.current_password = currentPassword;
      data.new_password = newPassword;
    }
    updateMutation.mutate(data);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Profile</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 700, margin: '0 auto',
                }}>
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <button style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--primary)', color: 'white',
                  border: '2px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <Camera size={14} />
                </button>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{user?.full_name}</h3>
              <span style={{
                padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                background: user?.role === 'admin' ? 'var(--error-bg)' : user?.role === 'agent' ? 'var(--warning-bg)' : 'var(--primary-bg)',
                color: user?.role === 'admin' ? 'var(--error)' : user?.role === 'agent' ? 'var(--warning)' : 'var(--primary)',
                textTransform: 'capitalize',
              }}>
                {user?.role}
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Full Name</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Email</label>
                <input className="input" value={user?.email || ''} disabled style={{ background: 'var(--background)', cursor: 'not-allowed' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Department</label>
                <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Change Password</h4>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Current Password</label>
                <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">New Password</label>
                <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Confirm New Password</label>
                <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Save size={18} /> Save Changes
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>My Recent Tickets</h3>
            {(tickets?.items || []).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tickets yet</p>
            ) : (
              (tickets?.items || []).map((t) => (
                <div key={t.id} style={{
                  padding: '12px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.ticket_number}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200 }} className="truncate">{t.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notification Preferences</h3>
            {['Ticket Created', 'Ticket Assigned', 'Status Changed', 'New Comment', 'SLA Warning'].map((n) => (
              <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                {n}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
