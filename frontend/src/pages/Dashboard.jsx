import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import client from '../api/client';
import { CardSkeleton } from '../components/common/Skeleton';
import { PriorityBadge } from '../components/common/PriorityBadge';

function KpiCard({ title, value, change, icon: Icon, color, format }) {
  const isUp = change >= 0;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
            {format === 'hours' ? `${value}h` : format === 'percent' ? `${value}%` : value}
          </div>
          {change !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: isUp ? 'var(--success)' : 'var(--error)' }}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(change).toFixed(1)}% vs last month
            </div>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}15`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [dateRange, setDateRange] = useState('month');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: () => client.get('/api/dashboard/stats').then(r => r.data.data),
  });

  const { data: volume } = useQuery({
    queryKey: ['dashboard-volume'],
    queryFn: () => client.get('/api/dashboard/volume').then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: () => client.get('/api/dashboard/by-category').then(r => r.data.data),
  });

  const { data: priorityWeek } = useQuery({
    queryKey: ['dashboard-priority-week'],
    queryFn: () => client.get('/api/dashboard/by-priority-week?weeks=8').then(r => r.data.data),
  });

  const { data: agentPerf } = useQuery({
    queryKey: ['dashboard-agent-perf'],
    queryFn: () => client.get('/api/dashboard/agent-performance').then(r => r.data.data),
  });

  const { data: slaBreached } = useQuery({
    queryKey: ['dashboard-sla'],
    queryFn: () => client.get('/api/dashboard/sla-breached?page_size=10').then(r => r.data.data),
  });

  if (statsLoading) return <CardSkeleton count={4} />;

  const categoryColors = {
    hardware: '#1976D2', software: '#7B1FA2', network: '#00897B',
    access: '#F57C00', email: '#0288D1', printer: '#5C6BC0',
    security: '#C62828', other: '#546E7A',
  };

  const donutData = (categories || []).map(c => ({
    name: c.name,
    value: c.count,
    fill: categoryColors[c.name] || '#546E7A',
  }));

  return (
    <div>
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
        <KpiCard title="Total Tickets (This Month)" value={stats?.total_tickets || 0} change={stats?.total_tickets_change} icon={AlertCircle} color="#1976D2" />
        <KpiCard title="Avg Resolution Time" value={stats?.avg_resolution_time || 0} change={stats?.avg_resolution_time_change} icon={Clock} color="#F57C00" format="hours" />
        <KpiCard title="SLA Compliance" value={stats?.sla_compliance || 0} change={undefined} icon={CheckCircle} color="#2E7D32" format="percent" />
        <KpiCard title="Open Tickets" value={stats?.open_tickets || 0} change={undefined} icon={AlertCircle} color="#C62828" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Ticket Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volume || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="created" name="Created" fill="#1976D2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#2E7D32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tickets by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={donutData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                {donutData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tickets by Priority per Week</h3>
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
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Agent Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(agentPerf || []).slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="agent_name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="resolved" name="Resolved" fill="#2E7D32" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent SLA Breached Tickets</h3>
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
                <td><a href={`/tickets/${t.id}`} style={{ fontWeight: 600, fontSize: 13 }}>{t.ticket_number}</a></td>
                <td style={{ maxWidth: 200 }} className="truncate">{t.title}</td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td>{t.assigned_agent}</td>
                <td style={{ color: 'var(--error)', fontWeight: 500 }}>{t.due_date ? new Date(t.due_date).toLocaleString() : '-'}</td>
                <td>{t.breach_duration}</td>
              </tr>
            ))}
            {(!slaBreached?.items || slaBreached.items.length === 0) && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No SLA breaches</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
