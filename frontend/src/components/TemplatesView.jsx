import React, { useState, useEffect } from 'react';
import { apiUrl } from '../api';
import { Icon } from './Icons';

export const TemplatesView = ({ setView, onUseTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    channel: 'whatsapp',
    category: 'general',
    subject: '',
    body: ''
  });

  // Default fallback templates matching Image 3 if backend empty
  const defaultTemplates = [
    {
      id: 'tmpl-1',
      name: 'Workshop Confirmation & Pass',
      description: 'Send registration confirmation with event details and digital pass information.',
      channel: 'whatsapp',
      category: 'EVENTS',
      body: "🎫 Hi {{name}}!\n\nYour registration for\n{{event_name}} is confirmed!\nDate: {{event_date}}\nWe've attached your digital pass.\nSee you there! 🔥",
      variables: ['name', 'event_name', 'event_date', 'pass_url'],
      status: 'Approved'
    },
    {
      id: 'tmpl-2',
      name: 'Payment Reminder Notice',
      description: 'Polite reminder for pending invoice payments with due date.',
      channel: 'gmail',
      category: 'FINANCE',
      subject: 'Invoice Reminder: {{invoice_num}} due for {{company}}',
      body: "Subject: Invoice Reminder:\n{{invoice_num}} due for\n{{company}}\n\nDear {{name}},\nThis is a gentle reminder that\ninvoice {{invoice_num}} for\n{{company}} in the amount of\n{{amount}} is due on\n{{due_date}}.",
      variables: ['name', 'invoice_num', 'company', 'amount', 'due_date'],
      status: 'Draft ready'
    },
    {
      id: 'tmpl-3',
      name: 'Interview Schedule Invitation',
      description: 'Invite candidates for an interview with role details and scheduling link.',
      channel: 'gmail',
      category: 'RECRUITING',
      subject: 'Invitation to Interview at {{company}} - {{role}}',
      body: "Subject: Invitation to Interview\nat {{company}} - {{role}}\n\nHello {{name}},\nThank you for applying for the\n{{role}} position at {{company}}.\nWe'd love to schedule a 30-minute\ninterview with you to learn more\nabout your background and\ndiscuss the next steps.",
      variables: ['name', 'role', 'company', 'interview', 'date'],
      status: 'Draft ready'
    },
    {
      id: 'tmpl-4',
      name: 'VIP Product Launch Alert',
      description: 'Announce new product launches to your VIP audience.',
      channel: 'whatsapp',
      category: 'MARKETING',
      body: "🚀 *Big News {{name}}!*\n\nOur brand new\n{{product_name}} is now live!\nGet early access, exclusive offers\nand special benefits just for you.\n\nCheck it out now: {{product_url}}",
      variables: ['name', 'product_name', 'product_url', 'offer_code'],
      status: 'Approved'
    }
  ];

  useEffect(() => {
    fetch(apiUrl('/api/templates'))
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (data && data.length > 0) {
          // Normalize backend templates to match format
          const formatted = data.map(d => ({
            id: d.id,
            name: d.name,
            description: d.category === 'events' ? 'Send registration confirmation with event details and digital pass information.' :
              d.category === 'finance' ? 'Polite reminder for pending invoice payments with due date.' :
              d.category === 'recruiting' ? 'Invite candidates for an interview with role details and scheduling link.' :
              'Announce new product launches to your VIP audience.',
            channel: d.channel,
            category: (d.category || 'general').toUpperCase(),
            subject: d.subject,
            body: d.body,
            variables: d.variables || ['name', 'event_name', 'date'],
            status: d.channel === 'whatsapp' ? 'Approved' : 'Draft ready'
          }));
          setTemplates(formatted);
        } else {
          setTemplates(defaultTemplates);
        }
      })
      .catch(() => setTemplates(defaultTemplates));
  }, []);

  const handleCopyBody = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = (tmpl) => {
    if (onUseTemplate) {
      onUseTemplate(tmpl);
    } else if (setView) {
      setView('wizard');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.body) {
      alert('Please provide name and body');
      return;
    }
    const created = {
      id: 'tmpl-' + Date.now(),
      name: newTemplate.name,
      description: 'Custom created template',
      channel: newTemplate.channel,
      category: newTemplate.category.toUpperCase(),
      subject: newTemplate.subject,
      body: newTemplate.body,
      variables: ['name', 'company'],
      status: newTemplate.channel === 'whatsapp' ? 'Approved' : 'Draft ready'
    };
    setTemplates(prev => [created, ...prev]);
    setShowCreateModal(false);
    setNewTemplate({ name: '', channel: 'whatsapp', category: 'general', subject: '', body: '' });
  };

  const filtered = templates.filter(t => {
    const matchesTab = activeTab === 'all' || t.channel.toLowerCase() === activeTab.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.variables && t.variables.some(v => v.toLowerCase().includes(q)));
    return matchesTab && matchesQuery;
  });

  return (
    <div className="page-container">
      {/* HEADER MATCHING IMAGE 3 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{
            color: '#06b6d4',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            TEMPLATE LIBRARY
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Message <span style={{ color: '#6366f1' }}>Templates</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '640px' }}>
            Pre-approved WhatsApp templates and reusable Gmail outreach drafts with variable bindings.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            padding: '10px 22px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
          }}
        >
          <Icon name="plus" size={15} color="#fff" />
          <span>Create Template</span>
        </button>
      </div>

      {/* SEARCH AND FILTER BAR MATCHING IMAGE 3 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '600px' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={17} />
          </div>
          <input
            className="input-field"
            style={{ paddingLeft: '44px', height: '46px', borderRadius: '12px', background: 'rgba(12, 16, 28, 0.85)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates, categories, or variables..."
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'all' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'all' ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'all' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'all' ? '0 2px 10px rgba(59, 130, 246, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            All
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'whatsapp' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'whatsapp' ? '#34d399' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon name="whatsapp" size={14} color={activeTab === 'whatsapp' ? '#10b981' : '#64748b'} />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('gmail')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'gmail' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'gmail' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'gmail' ? '#f87171' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon name="mail" size={14} color={activeTab === 'gmail' ? '#ef4444' : '#64748b'} />
            <span>Gmail</span>
          </button>
        </div>
      </div>

      {/* 4 TEMPLATE CARDS GRID MATCHING IMAGE 3 */}
      <div className="templates-grid">
        {filtered.map((tmpl) => {
          const isWhatsApp = tmpl.channel.toLowerCase() === 'whatsapp';
          const lines = tmpl.body.split('\n');

          return (
            <div
              key={tmpl.id}
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'rgba(12, 16, 27, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div>
                {/* Top Badges Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  {/* Channel Badge */}
                  {isWhatsApp ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#34d399',
                      letterSpacing: '0.04em'
                    }}>
                      <Icon name="whatsapp" size={13} color="#10b981" />
                      <span>WHATSAPP</span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#f87171',
                      letterSpacing: '0.04em'
                    }}>
                      <Icon name="mail" size={13} color="#ef4444" />
                      <span>GMAIL</span>
                    </div>
                  )}

                  {/* Category Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '9999px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#94a3b8',
                    letterSpacing: '0.05em'
                  }}>
                    {tmpl.category === 'EVENTS' && <Icon name="calendar" size={12} />}
                    {tmpl.category === 'FINANCE' && <Icon name="finance" size={12} />}
                    {tmpl.category === 'RECRUITING' && <Icon name="users" size={12} />}
                    {tmpl.category === 'MARKETING' && <Icon name="megaphone" size={12} />}
                    <span>{tmpl.category}</span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  {tmpl.name}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px', minHeight: '38px' }}>
                  {tmpl.description}
                </p>

                {/* Message Box with Line Numbers & Copy Button */}
                <div style={{
                  position: 'relative',
                  background: 'rgba(7, 9, 15, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '14px 14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                  color: '#e2e8f0',
                  lineHeight: 1.6,
                  height: '190px',
                  overflowY: 'auto',
                  marginBottom: '16px'
                }}>
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyBody(tmpl.id, tmpl.body)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      color: copiedId === tmpl.id ? '#10b981' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title="Copy message text"
                  >
                    <Icon name={copiedId === tmpl.id ? "check" : "copy"} size={13} color={copiedId === tmpl.id ? '#10b981' : '#94a3b8'} />
                  </button>

                  {lines.map((line, idx) => (
                    <div key={idx} className="code-line">
                      <span className="code-line-num">{idx + 1}</span>
                      <span className="code-line-text">{line || '\u00A0'}</span>
                    </div>
                  ))}
                </div>

                {/* Variables Row */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Variables:</span>
                    {tmpl.variables.map((v, i) => (
                      <span key={i} className="var-pill">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer: Status + Action Buttons */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isWhatsApp ? '#34d399' : '#f87171'
                }}>
                  <Icon name={isWhatsApp ? "whatsapp" : "mail"} size={14} color={isWhatsApp ? '#10b981' : '#ef4444'} />
                  <span>{isWhatsApp ? 'WhatsApp · Approved' : 'Gmail · Draft ready'}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPreviewTemplate(tmpl)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12.5px', borderRadius: '8px' }}
                  >
                    <Icon name="eye" size={13} />
                    <span>Preview</span>
                  </button>

                  <button
                    className={`btn ${isWhatsApp ? 'btn-whatsapp-solid' : 'btn-gmail-solid'} btn-sm`}
                    onClick={() => handleUse(tmpl)}
                    style={{ flex: 1.3, padding: '8px 12px', fontSize: '12.5px', borderRadius: '8px', fontWeight: 700 }}
                  >
                    <span>Use template</span>
                    <Icon name="arrow-right" size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }} onClick={() => setPreviewTemplate(null)}>
          <div style={{
            background: 'rgba(14, 18, 30, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '18px',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <Icon name="x-circle" size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Channel: <strong>{previewTemplate.channel}</strong> • Category: <strong>{previewTemplate.category}</strong>
            </div>

            <div style={{
              background: 'rgba(8, 10, 18, 0.9)',
              borderRadius: '12px',
              padding: '18px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '20px'
            }}>
              {previewTemplate.body}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setPreviewTemplate(null)}>
                Close
              </button>
              <button
                className={`btn ${previewTemplate.channel === 'whatsapp' ? 'btn-whatsapp-solid' : 'btn-gmail-solid'}`}
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  handleUse(t);
                }}
              >
                Use This Template in Wizard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: 'rgba(14, 18, 30, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '18px',
            padding: '28px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Create New Template</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <Icon name="x-circle" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Template Name</label>
                <input
                  className="input-field"
                  required
                  placeholder="e.g. Webinar Welcome Pass"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Channel</label>
                  <select
                    className="input-field"
                    value={newTemplate.channel}
                    onChange={(e) => setNewTemplate({ ...newTemplate, channel: e.target.value })}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="gmail">Gmail</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Category</label>
                  <select
                    className="input-field"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  >
                    <option value="EVENTS">Events</option>
                    <option value="FINANCE">Finance</option>
                    <option value="RECRUITING">Recruiting</option>
                    <option value="MARKETING">Marketing</option>
                  </select>
                </div>
              </div>

              {newTemplate.channel === 'gmail' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Email Subject</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Important notice regarding {{company}}"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  />
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Message Body</label>
                <textarea
                  className="input-field"
                  rows={6}
                  required
                  placeholder="Type message with {{variable_name}} tokens..."
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
