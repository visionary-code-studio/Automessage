import React, { useEffect, useState } from 'react';
import { Icon } from './Icons';

export const Dashboard = ({ setView, openCampaignMonitor }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="page-container">
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '32px',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(30, 36, 60, 0.6) 0%, rgba(17, 20, 32, 0.8) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-read">High-Throughput Automation</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Gmail + Meta Cloud API</span>
            </div>
            <h1 style={{ fontSize: '28px', color: '#fff', marginBottom: '8px' }}>
              Multi-Channel Bulk Messaging Operating Layer
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
              Upload any spreadsheet, validate phone numbers & email syntax, personalize templates with variables, 
              and dispatch sequentially with real-time delivery tracking.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setView('wizard')}>
              <Icon name="plus" size={16} />
              Create Campaign
            </button>
            <button className="btn btn-secondary" onClick={() => setView('integrations')}>
              <Icon name="whatsapp" size={16} color="#10b981" />
              WhatsApp & Integrations
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Campaigns
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
              <Icon name="activity" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
            {stats?.metrics?.active_campaigns || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats?.metrics?.total_campaigns || 0} total campaigns run
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Messages Dispatched
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: '#38bdf8' }}>
              <Icon name="send" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
            {stats?.metrics?.total_sent || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
            Across WhatsApp & Gmail
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Delivered / Read
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
              <Icon name="check-check" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
            {stats?.metrics?.total_delivered || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats?.metrics?.total_read || 0} read receipts recorded
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Delivery Rate
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
              <Icon name="shield-check" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>
            {stats?.metrics?.delivery_rate_pct || 100}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats?.metrics?.total_failed || 0} failed / bounced
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', color: '#fff' }}>Campaigns History</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click on any campaign to open the live cockpit monitor</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStats}>
            <Icon name="refresh" size={13} />
            Refresh
          </button>
        </div>

        {stats?.recent_campaigns && stats.recent_campaigns.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_campaigns.map((c) => {
                  const progressPct = c.valid_count > 0 ? Math.round(((c.sent_count + c.failed_count) / c.valid_count) * 100) : 0;
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openCampaignMonitor(c.id)}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#fff' }}>{c.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({c.source_filename})</span>
                        </div>
                      </td>
                      <td>
                        {c.channel === 'whatsapp' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                            <Icon name="whatsapp" size={14} color="#10b981" /> WhatsApp
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                            <Icon name="mail" size={14} color="#ef4444" /> Gmail
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          c.status === 'RUNNING' ? 'badge-processing' :
                          c.status === 'COMPLETED' ? 'badge-delivered' :
                          c.status === 'PAUSED' ? 'badge-duplicate' :
                          c.status === 'CANCELLED' ? 'badge-failed' : 'badge-queued'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ width: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, progressPct)}%`,
                              height: '100%',
                              background: c.channel === 'whatsapp' ? '#10b981' : '#6366f1',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{progressPct}%</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{c.sent_count} / {c.valid_count}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{c.delivered_count}</td>
                      <td style={{ color: c.failed_count > 0 ? '#ef4444' : 'var(--text-muted)' }}>{c.failed_count}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCampaignMonitor(c.id);
                          }}
                        >
                          <Icon name="eye" size={13} />
                          Cockpit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Icon name="file-spreadsheet" size={40} className="mb-2" />
            <p style={{ marginTop: '8px' }}>No campaigns launched yet. Click "Create Campaign" above to begin your first bulk dispatch.</p>
          </div>
        )}
      </div>
    </div>
  );
};
