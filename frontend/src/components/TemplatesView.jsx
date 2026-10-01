import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';

export const TemplatesView = ({ setView }) => {
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(console.error);
  }, []);

  const filtered = templates.filter(t => activeTab === 'all' || t.channel === activeTab);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: '#fff', marginBottom: '6px' }}>Message Templates</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Pre-approved WhatsApp templates and reusable Gmail outreach drafts with variable bindings.
          </p>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
          {['all', 'whatsapp', 'gmail'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="btn btn-sm"
              style={{
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {filtered.map(tmpl => (
          <div key={tmpl.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className={`badge ${tmpl.channel === 'whatsapp' ? 'badge-delivered' : 'badge-sent'}`}>
                {tmpl.channel}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {tmpl.category}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>{tmpl.name}</h3>

            {tmpl.subject && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <strong>Subject:</strong> {tmpl.subject}
              </div>
            )}

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              maxHeight: '130px',
              overflowY: 'auto',
              flex: 1,
              marginBottom: '16px',
              border: '1px solid var(--border-subtle)'
            }} dangerouslySetInnerHTML={{ __html: tmpl.body.replace(/\n/g, '<br/>') }} />

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Variables: {tmpl.variables?.map(v => (
                  <span key={v} style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '4px',
                    marginBottom: '4px',
                    color: '#a5b4fc'
                  }}>
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>

              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
                onClick={() => setView('wizard')}
              >
                <Icon name="plus" size={13} />
                Use In New Campaign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
