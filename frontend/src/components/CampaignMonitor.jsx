import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icons';

export const CampaignMonitor = ({ campaignId, setView }) => {
  const [campaign, setCampaign] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const eventSourceRef = useRef(null);

  // Fetch campaign details and messages
  const fetchCampaignData = async () => {
    if (!campaignId) return;
    try {
      const cRes = await fetch(`/api/campaigns/${campaignId}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setCampaign(cData);
      }
      fetchMessages();
    } catch (err) {
      console.error('Failed to fetch campaign:', err);
    }
  };

  const fetchMessages = async () => {
    if (!campaignId) return;
    try {
      const url = `/api/campaigns/${campaignId}/messages?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`;
      const mRes = await fetch(url);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMessages(mData.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // SSE Stream setup for live sub-second updates
  useEffect(() => {
    if (!campaignId) return;
    fetchCampaignData();

    // Connect to Server-Sent Events stream
    const sse = new EventSource(`/api/campaigns/${campaignId}/stream`);
    eventSourceRef.current = sse;

    sse.onmessage = (e) => {
      try {
        const packet = JSON.parse(e.data);
        const eventType = packet.event;
        const data = packet.data;

        // Append to event logs
        setEventLogs((prev) => [
          {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            type: eventType,
            text: data.status 
              ? `Message [${data.recipient_identifier || data.message_id}] → ${data.status}` 
              : `Campaign event: ${eventType}`
          },
          ...prev.slice(0, 40)
        ]);

        if (eventType === 'CAMPAIGN_COMPLETED' || eventType === 'CAMPAIGN_STARTED') {
          fetchCampaignData();
        } else if (eventType === 'MESSAGE_STATUS') {
          // Update message state locally or refresh
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message_id
                ? {
                    ...m,
                    status: data.status,
                    provider_message_id: data.provider_message_id || m.provider_message_id,
                    last_error_code: data.error_code || m.last_error_code,
                    last_error_message: data.error_message || m.last_error_message
                  }
                : m
            )
          );
          // Refetch campaign counters periodically
          fetchCampaignData();
        }
      } catch (err) {
        console.error('Error parsing SSE packet:', err);
      }
    };

    sse.onerror = () => {
      console.log('SSE connection closed or reconnecting');
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [campaignId]);

  // Re-fetch messages when filter or search changes
  useEffect(() => {
    fetchMessages();
  }, [filterStatus, searchQuery]);

  // Campaign controls
  const handlePause = async () => {
    setActionLoading(true);
    await fetch(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });
    fetchCampaignData();
    setActionLoading(false);
  };

  const handleResume = async () => {
    setActionLoading(true);
    await fetch(`/api/campaigns/${campaignId}/resume`, { method: 'POST' });
    fetchCampaignData();
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel the remaining queued messages?')) return;
    setActionLoading(true);
    await fetch(`/api/campaigns/${campaignId}/cancel`, { method: 'POST' });
    fetchCampaignData();
    setActionLoading(false);
  };

  const handleRetryFailed = async () => {
    setActionLoading(true);
    await fetch(`/api/campaigns/${campaignId}/retry-failed`, { method: 'POST' });
    fetchCampaignData();
    setActionLoading(false);
  };

  const handleExport = () => {
    window.location.href = `/api/campaigns/${campaignId}/export`;
  };

  if (!campaign) {
    return (
      <div style={{ maxWidth: '1280px', margin: '60px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="animate-spin" style={{ display: 'inline-block', fontSize: '24px', marginBottom: '12px' }}>⏳</span>
        <p>Connecting to Live Campaign Cockpit...</p>
      </div>
    );
  }

  const processedCount = (campaign.sent_count || 0) + (campaign.failed_count || 0);
  const totalCount = campaign.valid_count || 1;
  const progressPct = Math.min(100, Math.round((processedCount / totalCount) * 100));

  return (
    <div className="page-container">
      {/* Cockpit Top Bar */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setView('dashboard')}>
                <Icon name="arrow-left" size={14} /> Back
              </button>
              <h1 style={{ fontSize: '22px', color: '#fff', margin: 0 }}>{campaign.name}</h1>
              <span className={`badge ${
                campaign.status === 'RUNNING' ? 'badge-processing' :
                campaign.status === 'COMPLETED' ? 'badge-delivered' :
                campaign.status === 'PAUSED' ? 'badge-duplicate' :
                campaign.status === 'CANCELLED' ? 'badge-failed' : 'badge-queued'
              }`}>
                {campaign.status}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: campaign.channel === 'whatsapp' ? '#10b981' : '#ef4444'
              }}>
                <Icon name={campaign.channel === 'whatsapp' ? 'whatsapp' : 'mail'} size={14} />
                {campaign.channel.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Source: <code>{campaign.source_filename}</code> • Started: {new Date(campaign.created_at).toLocaleTimeString()}
            </span>
          </div>

          {/* Action Dock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {campaign.status === 'RUNNING' && (
              <button className="btn btn-secondary btn-sm" onClick={handlePause} disabled={actionLoading}>
                <Icon name="pause" size={14} /> Pause
              </button>
            )}

            {campaign.status === 'PAUSED' && (
              <button className="btn btn-primary btn-sm" onClick={handleResume} disabled={actionLoading}>
                <Icon name="play" size={14} /> Resume
              </button>
            )}

            {campaign.failed_count > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleRetryFailed} disabled={actionLoading}>
                <Icon name="rotate-ccw" size={14} color="#fbbf24" /> Retry Failed ({campaign.failed_count})
              </button>
            )}

            {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED' || campaign.status === 'QUEUED') && (
              <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={actionLoading}>
                <Icon name="x-circle" size={14} /> Cancel
              </button>
            )}

            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Icon name="download" size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Progress: <strong>{processedCount}</strong> of <strong>{campaign.valid_count}</strong> processed
            </span>
            <span style={{ fontWeight: 700, color: '#fff' }}>{progressPct}%</span>
          </div>

          <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: campaign.channel === 'whatsapp' 
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
                : 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Real-time Status Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Queued</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#cbd5e1', marginTop: '4px' }}>
            {campaign.queued_count || 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#818cf8', textTransform: 'uppercase' }}>Sent</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
            {campaign.sent_count || 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase' }}>Delivered</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {campaign.delivered_count || 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase' }}>Read Receipts</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {campaign.read_count || 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#f87171', textTransform: 'uppercase' }}>Failed</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {campaign.failed_count || 0}
          </div>
        </div>
      </div>

      {/* Interactive Recipient Checklist & Live Stream Grid */}
      <div className="monitor-grid">
        {/* Recipient Status Checklist Table */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Recipient Delivery Checklist</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click any row to inspect provider payload</span>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: filterStatus === st ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: filterStatus === st ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: '16px' }}>
            <input
              className="input-field"
              placeholder="Search by recipient name, email/phone, or provider message ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>

          {/* Table */}
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Identifier</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <tr
                      key={m.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedMessage(m)}
                    >
                      <td style={{ fontWeight: 600 }}>{m.recipient_name || 'Unnamed'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{m.recipient_identifier}</td>
                      <td>
                        <span className={`badge ${
                          m.status === 'READ' ? 'badge-read' :
                          m.status === 'DELIVERED' ? 'badge-delivered' :
                          m.status === 'SENT' ? 'badge-sent' :
                          m.status === 'PROCESSING' ? 'badge-processing' :
                          m.status === 'FAILED' ? 'badge-failed' : 'badge-queued'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {m.sent_at ? new Date(m.sent_at).toLocaleTimeString() : '—'}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }}>
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      No messages matching filter: {filterStatus}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live SSE Event Stream Ticker */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulse-ring 1.5s infinite'
            }} />
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Live Event Stream</h3>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '12px',
            height: '420px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: 1.6
          }}>
            {eventLogs.length > 0 ? (
              eventLogs.map((log) => (
                <div key={log.id} style={{ marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>[{log.time}] </span>
                  <span style={{
                    color: log.text.includes('DELIVERED') || log.text.includes('READ') ? '#34d399' :
                           log.text.includes('SENT') ? '#818cf8' :
                           log.text.includes('FAILED') ? '#f87171' : '#38bdf8'
                  }}>
                    {log.text}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Listening for real-time provider webhook and queue dispatch events...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row Inspector Modal */}
      {selectedMessage && (
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
          zIndex: 100
        }} onClick={() => setSelectedMessage(null)}>
          <div
            className="glass-panel"
            style={{ width: '600px', maxWidth: '90%', padding: '28px', background: '#111420' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: '#fff' }}>Message Delivery Inspector</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {selectedMessage.id}</span>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setSelectedMessage(null)}
              >
                <Icon name="x-circle" size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Recipient:</span>
                <div style={{ fontWeight: 600, color: '#fff' }}>{selectedMessage.recipient_name || 'Unnamed'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Identifier:</span>
                <div style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{selectedMessage.recipient_identifier}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                <div style={{ marginTop: '2px' }}>
                  <span className={`badge ${
                    selectedMessage.status === 'READ' ? 'badge-read' :
                    selectedMessage.status === 'DELIVERED' ? 'badge-delivered' :
                    selectedMessage.status === 'SENT' ? 'badge-sent' :
                    selectedMessage.status === 'FAILED' ? 'badge-failed' : 'badge-queued'
                  }`}>
                    {selectedMessage.status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Provider Message ID:</span>
                <div style={{ fontFamily: 'monospace', color: '#10b981' }}>{selectedMessage.provider_message_id || 'Pending assignment'}</div>
              </div>
            </div>

            {selectedMessage.last_error_message && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#f87171'
              }}>
                <strong>{selectedMessage.last_error_code}:</strong> {selectedMessage.last_error_message}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Rendered Message Content:</span>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '13px',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'pre-wrap',
                color: '#fff',
                maxHeight: '180px',
                overflowY: 'auto'
              }} dangerouslySetInnerHTML={{ __html: selectedMessage.rendered_body.replace(/\n/g, '<br/>') }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMessage(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
