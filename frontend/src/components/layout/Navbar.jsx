import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export function Navbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header style={{
      height: 64,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn-icon mobile-menu" onClick={onMenuClick} style={{ display: 'none' }}>
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setShowNotif(!showNotif)}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--error)',
              }} />
            )}
          </button>
          {showNotif && (
            <div className="card" style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 360, maxHeight: 400, overflow: 'auto', zIndex: 200,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>Notifications</strong>
                <button onClick={markAllAsRead} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none' }}>
                  Mark all read
                </button>
              </div>
              {notifications.slice(0, 10).map((n) => (
                <div key={n.id} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  background: n.is_read ? 'transparent' : 'var(--primary-bg)',
                  cursor: 'pointer',
                }}
                  onClick={() => {
                    if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
                    setShowNotif(false);
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{n.message}</div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No notifications
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 'var(--radius)',
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600,
            }}>
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
          </button>
          {showProfile && (
            <div className="card" style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 200, zIndex: 200, padding: 8,
            }}>
              <button onClick={() => { navigate('/profile'); setShowProfile(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, borderRadius: 'var(--radius-sm)' }}>
                <User size={16} /> Profile
              </button>
              <button onClick={() => { logout(); navigate('/login'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, borderRadius: 'var(--radius-sm)', color: 'var(--error)' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
