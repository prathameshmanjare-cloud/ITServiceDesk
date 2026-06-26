import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import client from '../api/client';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { CardSkeleton } from '../components/common/Skeleton';

const COLORS = {
  hardware: '#1976D2', software: '#7B1FA2', network: '#00897B',
  access: '#F57C00', email: '#0288D1', printer: '#5C6BC0',
  security: '#C62828', other: '#546E7A',
};

export function Reports() {
  const [dateRange, setDateRange] = useState('month');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['reports-stats', dateRange],
    queryFn: () => client.get('/api/dashboard/stats').then(r => r.data.data),
  });

  const { data: volume } = useQuery({
    queryKey: ['reports-volume', dateRange],
    queryFn: () => client.get('/api/dashboard/volume').then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['reports-categories', dateRange],
    queryFn: () => client.get('/api/dashboard/by-category').then(r => r.data.data),
  });

  const { data: priorityWeek } = useQuery({
    queryKey: ['reports-priority-week'],
    queryFn: () => client.get('/api/dashboard/by-priority-week?weeks=8').then(r => r.data.data),
  });

  const { data: agentPerf } = useQuery({
    queryKey: ['reports-agent-perf', dateRange],
    queryFn: () => client.get('/api/dashboard/agent-performance').then(r => r.data.data),
  });

  const { data: slaBreached } = useQuery({
    queryKey: ['reports-sla', dateRange],
    queryFn: () => client.get('/api/dashboard/sla-breached?page_size=10').then(r => r.data.data),
  });

  const exportCSV = () => {
    if (!slaBreached?.items) return;
    const headers = ['Ticket #', 'Title', 'Priority', 'Assigned Agent', 'Due Date', 'Breach Duration'];
    const rows = slaBreached.items.map(t => [
      t.ticket_number, `"${t.title}"`, t.priority, t.assigned_agent, t.due_date, t.breach_duration
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-breached-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <CardSkeleton count={4} />;

  const donutData = (categories || []).map(c => ({ name: c.name, value: c.count, fill: COLORS[c.name] || '#546E7A' }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Reports & Analytics</h2>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={16} /> Export CSV</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {['Today', 'This Week', 'This Month', 'Last 3 Months'].map((label) => (
          <button
            key={label}
            className={`btn btn-sm ${dateRange === label.toLowerCase().replace(' ', '_') ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateRange(label.toLowerCase().replace(' ', '_'))}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Tickets', value: stats?.total_tickets || 0, color: '#1976D2' },
          { label: 'Avg Resolution (hrs)', value: stats?.avg_resolution_time || 0, color: '#F57C00', suffix: 'h' },
          { label: 'SLA Compliance', value: stats?.sla_compliance || 0, color: '#2E7D32', suffix: '%' },
          { label: 'Open Tickets', value: stats?.open_tickets || 0, color: '#C62828' },
        ].map((card) => (
          <div key={card.label} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
              {card.value}{card.suffix || ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Ticket Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volume || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#1976D2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resolved" stroke="#2E7D32" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>By Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                {donutData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Priority per Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityWeek || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="critical" name="Critical" stackId="a" fill="#C62828" />
              <Bar dataKey="high" name="High" stackId="a" fill="#F57C00" />
              <Bar dataKey="medium" name="Medium" stackId="a" fill="#1976D2" />
              <Bar dataKey="low" name="Low" stackId="a" fill="#2E7D32" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Agent Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(agentPerf || []).slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="agent_name" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Legend />
              <Bar dataKey="resolved" name="Resolved" fill="#2E7D32" radius={[0, 4, 4, 0]} />
              <Bar dataKey="sla_compliance" name="SLA %" fill="#1976D2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>SLA Breached Tickets</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Assigned Agent</th>
              <th>Due Date</th>
              <th>Breach Duration</th>
            </tr>
          </thead>
          <tbody>
            {(slaBreached?.items || []).map((t) => (
              <tr key={t.id}>
                <td><strong style={{ fontSize: 13 }}>{t.ticket_number}</strong></td>
                <td style={{ maxWidth: 200 }} className="truncate">{t.title}</td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td>{t.assigned_agent}</td>
                <td style={{ color: 'var(--error)', fontWeight: 500 }}>{t.due_date ? new Date(t.due_date).toLocaleString() : '-'}</td>
                <td>{t.breach_duration}</td>
              </tr>
            ))}
            {(!slaBreached?.items || slaBreached.items.length === 0) && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No breaches</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
