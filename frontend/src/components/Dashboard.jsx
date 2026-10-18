import React, { useEffect, useState } from 'react';
import { apiUrl } from '../api';
import { Icon } from './Icons';

export const Dashboard = ({ setView, openCampaignMonitor }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(apiUrl('/api/stats'));
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
      {/* HERO BANNER CARD */}
      <div className="glass-panel" style={{
        padding: '36px 40px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(14, 18, 32, 0.85) 0%, rgba(9, 12, 22, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px'
      }}>
        {/* Subtle background ambient gradients */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '-60px',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-60px',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.25fr) minmax(280px, 1fr)',
          alignItems: 'center',
          gap: '32px'
        }}>
          {/* Left Hero Content */}
          <div style={{ zIndex: 1 }}>
            {/* Tag */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '9999px',
              marginBottom: '16px'
            }}>
              <span style={{
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                fontFamily: 'monospace'
              }}>
                HIGH-THROUGHPUT AUTOMATION
              </span>
              <span style={{ color: '#10b981', fontSize: '10px' }}>◄</span>
              <span style={{ color: '#64748b', fontSize: '11px' }}>•</span>
              <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>
                Gmail API + WhatsApp Cloud API
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: '36px',
              lineHeight: 1.15,
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '16px',
              letterSpacing: '-0.02em'
            }}>
              Multi-Channel Bulk Messaging,<br />
              <span style={{
                background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                One Control Center
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: 1.6,
              maxWidth: '520px',
              marginBottom: '26px'
            }}>
              Import contacts from spreadsheets, validate phone numbers and email syntax, personalize templates, and monitor delivery in real time.
            </p>

            {/* Buttons Row */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-whatsapp-solid"
                onClick={() => setView('wizard')}
                style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '12px', fontWeight: 700 }}
              >
                <Icon name="plus" size={16} />
                <span>Create Campaign</span>
                <span style={{ fontSize: '14px', opacity: 0.8 }}>›</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setView('integrations')}
                style={{ padding: '12px 22px', fontSize: '14px', borderRadius: '12px', fontWeight: 600 }}
              >
                <Icon name="settings" size={16} color="#94a3b8" />
                <span>WhatsApp & Integrations</span>
                <span style={{ fontSize: '14px', opacity: 0.8 }}>›</span>
              </button>
            </div>
          </div>

          {/* Right Visual Graphic Network matching Image 1 */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* SVG Connecting Flow Lines */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible'
              }}
              viewBox="0 0 400 240"
              fill="none"
            >
              <defs>
                <linearGradient id="green-flow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="red-flow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Green Wave Lines converging to center */}
              <path
                d="M 120 70 C 180 70, 160 120, 200 120"
                stroke="url(#green-flow)"
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.8"
              />
              <path
                d="M 120 85 C 160 85, 175 118, 200 120"
                stroke="#10b981"
                strokeWidth="1.5"
                opacity="0.4"
              />
              <path
                d="M 100 100 C 145 105, 170 120, 200 120"
                stroke="#10b981"
                strokeWidth="1"
                opacity="0.3"
              />

              {/* Red Wave Lines spreading from center to Gmail */}
              <path
                d="M 200 120 C 240 120, 220 170, 280 170"
                stroke="url(#red-flow)"
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.8"
              />
              <path
                d="M 200 120 C 230 122, 245 155, 280 155"
                stroke="#ef4444"
                strokeWidth="1.5"
                opacity="0.4"
              />
              <path
                d="M 200 120 C 235 125, 260 140, 300 140"
                stroke="#ef4444"
                strokeWidth="1"
                opacity="0.3"
              />

              {/* Floating ambient glow dots */}
              <circle cx="160" cy="95" r="2.5" fill="#10b981" opacity="0.8" />
              <circle cx="240" cy="145" r="2.5" fill="#ef4444" opacity="0.8" />
              <circle cx="215" cy="85" r="1.5" fill="#06b6d4" opacity="0.6" />
              <circle cx="185" cy="155" r="1.5" fill="#06b6d4" opacity="0.6" />
            </svg>

            {/* Left WhatsApp Card */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '10px',
              background: 'rgba(10, 16, 24, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '12px 14px',
              width: '135px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
              backdropFilter: 'blur(10px)',
              zIndex: 2
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="whatsapp" size={16} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>WhatsApp</div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Reach instantly</div>
                  </div>
                </div>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', width: '85%', marginBottom: '4px' }} />
              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', width: '60%' }} />
            </div>

            {/* Center Dispatch Hub Node */}
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0c1b33 0%, #06b6d4 100%)',
              border: '2px solid rgba(0, 242, 254, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.6)',
              zIndex: 3
            }}>
              <Icon name="send" size={22} color="#ffffff" />
            </div>

            {/* Right Gmail Card */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              right: '10px',
              background: 'rgba(16, 10, 16, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '12px 14px',
              width: '135px',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
              backdropFilter: 'blur(10px)',
              zIndex: 2
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="mail" size={16} color="#ef4444" />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>Gmail</div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Deliver reliably</div>
                  </div>
                </div>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} />
              </div>
              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', width: '85%', marginBottom: '4px' }} />
              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', width: '60%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* METRICS ROW (4 STAT CARDS MATCHING IMAGE 1) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Card 1: Active Campaigns */}
        <div className="glass-panel" style={{ padding: '22px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Icon name="activity" size={18} color="#3b82f6" />
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}>
              <Icon name="chevron-right" size={16} />
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            ACTIVE CAMPAIGNS
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, fontFamily: 'Outfit' }}>
            {stats?.metrics?.active_campaigns || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            {stats?.metrics?.total_campaigns || 0} total campaigns run
          </div>
        </div>

        {/* Card 2: Messages Dispatched */}
        <div className="glass-panel" style={{ padding: '22px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4'
            }}>
              <Icon name="send" size={18} color="#06b6d4" />
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}>
              <Icon name="chevron-right" size={16} />
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            MESSAGES DISPATCHED
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, fontFamily: 'Outfit' }}>
            {stats?.metrics?.total_sent || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Across WhatsApp & Gmail
          </div>
        </div>

        {/* Card 3: Delivered / Read */}
        <div className="glass-panel" style={{ padding: '22px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <Icon name="check-circle" size={18} color="#10b981" />
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}>
              <Icon name="chevron-right" size={16} />
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            DELIVERED / READ
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', lineHeight: 1.1, fontFamily: 'Outfit' }}>
            {stats?.metrics?.total_delivered || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            {stats?.metrics?.total_read || 0} read receipts recorded
          </div>
        </div>

        {/* Card 4: Delivery Rate */}
        <div className="glass-panel" style={{ padding: '22px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <Icon name="shield-check" size={18} color="#f59e0b" />
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}>
              <Icon name="chevron-right" size={16} />
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            DELIVERY RATE
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b', lineHeight: 1.1, fontFamily: 'Outfit' }}>
            {stats?.metrics?.delivery_rate_pct !== undefined ? stats.metrics.delivery_rate_pct : 100}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            {stats?.metrics?.total_failed || 0} failed / bounced
          </div>
        </div>
      </div>

      {/* CAMPAIGNS HISTORY PANEL MATCHING IMAGE 1 */}
      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8'
            }}>
              <Icon name="file-text" size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>Campaigns History</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                Click on any campaign to open the live cockpit monitor.
              </p>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchStats}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}
          >
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Empty State matching Image 1 */}
        {(!stats?.recent_campaigns || stats.recent_campaigns.length === 0) ? (
          <div style={{
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '56px 20px',
            textAlign: 'center',
            background: 'rgba(8, 11, 20, 0.4)'
          }}>
            {/* Radiating document icon: - - 📄 - - */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ color: '#475569', fontSize: '16px', letterSpacing: '4px' }}>— —</span>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8'
              }}>
                <Icon name="file-text" size={24} color="#94a3b8" />
              </div>
              <span style={{ color: '#475569', fontSize: '16px', letterSpacing: '4px' }}>— —</span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              No campaigns launched yet.
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '22px' }}>
              Create your first bulk dispatch to get started.
            </p>

            <button
              className="btn btn-whatsapp-solid"
              onClick={() => setView('wizard')}
              style={{ padding: '10px 22px', fontSize: '13px', borderRadius: '10px', fontWeight: 700 }}
            >
              <Icon name="plus" size={15} />
              <span>Create Campaign</span>
            </button>
          </div>
        ) : (
          /* Table of recent campaigns */
          <div style={{ overflowX: 'auto' }}>
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
                          c.status === 'RUNNING' ? 'badge-whatsapp-selected' :
                          c.status === 'COMPLETED' ? 'badge-whatsapp-selected' : 'badge-secondary'
                        }`} style={{ background: c.status === 'RUNNING' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: c.status === 'RUNNING' ? '#38bdf8' : '#34d399' }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ width: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, progressPct)}%`,
                              height: '100%',
                              background: c.channel === 'whatsapp' ? '#10b981' : '#3b82f6',
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
                          <span>Cockpit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
