import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Upload, Monitor, HardDrive, Globe, Key, Mail, Printer, Shield, HelpCircle } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';

const steps = ['Basic Info', 'Details', 'Review'];

const categoryIcons = {
  hardware: Monitor, software: HardDrive, network: Globe,
  access: Key, email: Mail, printer: Printer,
  security: Shield, other: HelpCircle,
};

export function CreateTicket() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('medium');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) => client.post('/api/tickets', data),
    onSuccess: (res) => {
      const ticket = res.data.data;
      toast.success(`Ticket ${ticket.ticket_number} created successfully`);
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    },
  });

  const validateStep1 = () => {
    const e = {};
    if (!title.trim()) e.title = 'Title is required';
    if (title.length > 200) e.title = 'Title must be under 200 characters';
    if (!description.trim()) e.description = 'Description is required';
    if (description.length < 50) e.description = `Description must be at least 50 characters (${description.length}/50)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleSubmit = () => {
    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      department,
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Create New Ticket</h2>

      <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            flex: 1, padding: '12px 16px', textAlign: 'center',
            background: step > i + 1 ? 'var(--success)' : step === i + 1 ? 'var(--primary)' : 'var(--surface)',
            color: step > i + 1 || step === i + 1 ? 'white' : 'var(--text-secondary)',
            fontWeight: step === i + 1 ? 600 : 400,
            fontSize: 13, borderRight: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
            transition: 'all 0.3s',
          }}>
            {step > i + 1 ? '✓' : `0${i + 1}`} {s}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 32 }}>
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Basic Information</h3>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Title *</label>
              <input
                className={`input ${errors.title ? 'input-error' : ''}`}
                placeholder="Brief summary of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              {errors.title && <div className="error-text">{errors.title}</div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {Object.entries(categoryIcons).map(([cat, Icon]) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '12px 8px', border: `2px solid ${category === cat ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', background: category === cat ? 'var(--primary-bg)' : 'var(--surface)',
                      cursor: 'pointer', fontSize: 12, textTransform: 'capitalize',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={20} color={category === cat ? 'var(--primary)' : 'var(--text-secondary)'} />
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Description * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({description.length}/50 min)</span></label>
              <textarea
                className={`input ${errors.description ? 'input-error' : ''}`}
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                style={{ resize: 'vertical' }}
              />
              {errors.description && <div className="error-text">{errors.description}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleNext}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Details</h3>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Department</label>
              <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select department</option>
                {['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Urgency</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { key: 'low', color: '#2E7D32', bg: '#E8F5E9' },
                  { key: 'medium', color: '#1976D2', bg: '#E3F2FD' },
                  { key: 'high', color: '#F57C00', bg: '#FFF3E0' },
                  { key: 'critical', color: '#C62828', bg: '#FFEBEE' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriority(p.key)}
                    style={{
                      padding: '16px 8px', textAlign: 'center',
                      border: `2px solid ${priority === p.key ? p.color : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      background: priority === p.key ? p.bg : 'var(--surface)',
                      cursor: 'pointer', textTransform: 'capitalize',
                      fontWeight: priority === p.key ? 600 : 400,
                      fontSize: 13, transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, margin: '0 auto 6px' }} />
                    {p.key}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Attachments (optional)</label>
              <div
                style={{
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                  padding: 32, textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                onDrop={(e) => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]); }}
              >
                <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Drag & drop files here, or click to browse</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, PDF, DOC up to 10MB</p>
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
                  id="file-upload"
                />
              </div>
              {files.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {files.map((f, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'var(--background)', borderRadius: 'var(--radius-sm)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {f.name}
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 14 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={18} /> Back</button>
              <button className="btn btn-primary" onClick={handleNext}>Review <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Review Your Ticket</h3>
            <div className="card" style={{ padding: 20, border: '1px solid var(--border)', marginBottom: 20 }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  {[
                    ['Title', title],
                    ['Category', category],
                    ['Department', department || 'Not specified'],
                    ['Priority', priority],
                    ['Description', description.length > 100 ? description.substring(0, 100) + '...' : description],
                    ['Attachments', `${files.length} file(s)`],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, width: 140 }}>{label}</td>
                      <td style={{ padding: '8px 12px', fontSize: 14, textTransform: 'capitalize' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={18} /> Edit</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                style={{ background: mutation.isPending ? 'var(--text-muted)' : 'var(--primary)' }}
              >
                {mutation.isPending ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
