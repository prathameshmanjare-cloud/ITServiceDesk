import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/tickets': 'Tickets',
  '/create-ticket': 'Create Ticket',
  '/users': 'Users',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
};

export function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = Object.entries(pageTitles).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'IT Service Desk';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div style={{
        marginLeft: collapsed ? 64 : 260,
        flex: 1,
        transition: 'margin-left 0.3s',
        minWidth: 0,
      }}>
        <Navbar title={title} />
        <main style={{ padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
