import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, List, PlusCircle, Users, BarChart3,
  Bell, User, ChevronLeft, ChevronRight, Wrench, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'agent', 'user'] },
  { to: '/tickets', label: 'My Tickets', icon: Ticket, roles: ['user'] },
  { to: '/tickets', label: 'All Tickets', icon: List, roles: ['admin', 'agent'] },
  { to: '/create-ticket', label: 'Create Ticket', icon: PlusCircle, roles: ['admin', 'agent', 'user'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'agent'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'agent', 'user'] },
  { to: '/profile', label: 'Profile', icon: User, roles: ['admin', 'agent', 'user'] },
];

export function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside style={{
      width: collapsed ? 64 : 260,
      height: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      transition: 'width 0.3s',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--border)',
        height: 64,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Wrench size={18} />
        </div>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            IT Service Desk
          </span>
        )}
      </div>

      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              color: location.pathname.startsWith(item.to) && item.to !== '/tickets'
                || (item.to === '/tickets' && location.pathname === '/tickets')
                ? 'white' : 'var(--text-secondary)',
              background: location.pathname.startsWith(item.to) && item.to !== '/tickets'
                || (item.to === '/tickets' && location.pathname === '/tickets')
                ? 'var(--primary)' : 'transparent',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 2,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!(location.pathname.startsWith(item.to))) {
                e.currentTarget.style.background = 'var(--primary-bg)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(location.pathname.startsWith(item.to))) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border)',
      }}>
        {!collapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>
              {user.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', truncate: true }}>{user.full_name}</div>
              <span style={{
                fontSize: 11, padding: '1px 6px', borderRadius: 4,
                background: user.role === 'admin' ? 'var(--error-bg)' : user.role === 'agent' ? 'var(--warning-bg)' : 'var(--primary-bg)',
                color: user.role === 'admin' ? 'var(--error)' : user.role === 'agent' ? 'var(--warning)' : 'var(--primary)',
                textTransform: 'capitalize', fontWeight: 500,
              }}>
                {user.role}
              </span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onToggle}
            className="btn-icon"
            style={{ flex: collapsed ? 1 : 'none', justifyContent: 'center' }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            onClick={logout}
            className="btn-icon"
            style={{ color: 'var(--error)' }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
