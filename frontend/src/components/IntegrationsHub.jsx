import React, { useState, useEffect } from 'react';
import { apiUrl } from '../api';
import { Icon } from './Icons';

export const IntegrationsHub = () => {
  const [integrations, setIntegrations] = useState([]);
  const [copied, setCopied] = useState(false);

  // WhatsApp QR Code Bridge state
  const [bridgeStatus, setBridgeStatus] = useState(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);

  // Form states for editing credentials
  const [editingProvider, setEditingProvider] = useState(null);
  const [formFields, setFormFields] = useState({
    account_identifier: '',
    phone_number_id: '',
    waba_id: '',
    access_token_encrypted: '',
    refresh_token_encrypted: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(apiUrl('/api/integrations'));
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBridgeStatus = async () => {
    try {
      const res = await fetch(apiUrl('/api/whatsapp-bridge/status'));
      if (res.ok) {
        const data = await res.json();
        setBridgeStatus(data);
      }
    } catch (err) {
      setBridgeStatus({ status: 'OFFLINE' });
    } finally {
      setBridgeLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setRefreshingQr(true);
    try {
      const res = await fetch(apiUrl('/api/whatsapp-bridge/refresh-qr'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBridgeStatus(data);
      } else {
        await fetchBridgeStatus();
      }
    } catch (err) {
      console.error('Error refreshing QR:', err);
      await fetchBridgeStatus();
    } finally {
      setRefreshingQr(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchBridgeStatus();
    const interval = setInterval(fetchBridgeStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/webhooks/whatsapp`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSimulation = async (id, currentVal) => {
    try {
      const res = await fetch(apiUrl(`/api/integrations/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_simulated: currentVal ? 0 : 1 })
      });
      if (res.ok) {
        const updated = await res.json();
        setIntegrations(prev => prev.map(i => i.id === id ? updated : i));
      }
    } catch (err) {
      alert('Failed to update integration: ' + err.message);
    }
  };

  const setBaileysAsActiveSender = async () => {
    const wa = integrations.find(i => i.provider === 'whatsapp');
    if (!wa) return;
    try {
      const res = await fetch(apiUrl(`/api/integrations/${wa.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_simulated: 0,
          phone_number_id: 'baileys_session',
          account_identifier: bridgeStatus?.user ? `+${bridgeStatus.user.id}` : wa.account_identifier
        })
      });
      if (res.ok) {
        alert('Linked WhatsApp device is now the active sender for all campaigns!');
        fetchIntegrations();
      }
    } catch (err) {
      alert('Failed to activate: ' + err.message);
    }
  };

  const handleBridgeLogout = async () => {
    if (!confirm('Unlink this WhatsApp session and generate a new QR code?')) return;
    setRefreshingQr(true);
    try {
      const res = await fetch(apiUrl('/api/whatsapp-bridge/reset'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBridgeStatus(data);
        fetchIntegrations();
      } else {
        await fetch(apiUrl('/api/whatsapp-bridge/logout'), { method: 'POST' });
        setTimeout(fetchBridgeStatus, 1500);
      }
    } catch (err) {
      alert('Unlink failed: ' + err.message);
    } finally {
      setRefreshingQr(false);
    }
  };

  const startEdit = (provider) => {
    const item = integrations.find(i => i.provider === provider);
    if (item) {
      setEditingProvider(provider);
      setFormFields({
        account_identifier: item.account_identifier || '',
        phone_number_id: item.phone_number_id || '',
        waba_id: item.waba_id || '',
        access_token_encrypted: item.access_token_encrypted || '',
        refresh_token_encrypted: item.refresh_token_encrypted || ''
      });
    }
  };

  const handleSaveCredentials = async () => {
    const item = integrations.find(i => i.provider === editingProvider);
    if (!item) return;
    setSaveLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/integrations/${item.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_identifier: formFields.account_identifier,
          phone_number_id: formFields.phone_number_id,
          waba_id: formFields.waba_id,
          access_token_encrypted: formFields.access_token_encrypted,
          refresh_token_encrypted: formFields.refresh_token_encrypted
        })
      });
      if (res.ok) {
        alert('Credentials saved securely!');
        setEditingProvider(null);
        fetchIntegrations();
      }
    } catch (err) {
      alert('Error saving credentials: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const wa = integrations.find(i => i.provider === 'whatsapp');
  const gm = integrations.find(i => i.provider === 'gmail');

  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', color: '#fff', marginBottom: '6px' }}>Channel Delivery Integrations</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Connect your accounts to send real messages. Choose between <strong>WhatsApp Web QR Code</strong> (Alternate 1), <strong>Meta Cloud API</strong>, or <strong>Gmail</strong>.
        </p>
      </div>

      {/* FEATURED: WHATSAPP WEB QR CODE BRIDGE (ALTERNATE 1) */}
      <div className="glass-panel" style={{
        padding: '32px',
        marginBottom: '32px',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 20, 32, 0.85) 100%)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-delivered">Alternate 1 • Zero Meta Setup</span>
              {bridgeStatus?.status === 'CONNECTED' ? (
                <span className="badge badge-valid">🟢 Session Linked</span>
              ) : bridgeStatus?.status === 'SCAN_QR' ? (
                <span className="badge badge-processing">📷 Ready to Scan</span>
              ) : (
                <span className="badge badge-queued">Connecting...</span>
              )}
            </div>

            <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px' }}>
              📱 WhatsApp Web QR Code Linker
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
              Link your existing personal or business WhatsApp number directly by scanning the QR code below from your phone. 
              <strong> No Facebook developer account, no business verification, and no template approvals required!</strong>
            </p>

            {bridgeStatus?.status === 'CONNECTED' ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Icon name="check-circle" size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#fff' }}>{bridgeStatus?.user?.name || 'WhatsApp Account'}</h3>
                    <span style={{ fontSize: '13px', color: '#34d399', fontFamily: 'monospace' }}>
                      +{bridgeStatus?.user?.id}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                  Your phone is actively linked. Outbound campaign messages will be sent directly through this WhatsApp number.
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-whatsapp btn-sm" onClick={setBaileysAsActiveSender}>
                    <Icon name="check" size={14} /> Set as Active WhatsApp Sender
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleBridgeLogout}>
                    <Icon name="x-circle" size={14} /> Unlink Device
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>How to Link Your Phone:</div>
                <ol style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings</strong> (iOS) or <strong>Three Dots ⋮</strong> (Android)</li>
                  <li>Select <strong>Linked Devices</strong> &gt; tap <strong>Link a Device</strong></li>
                  <li>Point your camera at the QR code on the right</li>
                </ol>
              </div>
            )}
          </div>

          {/* QR Code Display Container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            width: '280px',
            minHeight: '280px',
            textAlign: 'center'
          }}>
            {bridgeStatus?.status === 'CONNECTED' ? (
              <div style={{ color: '#059669', padding: '16px 0', width: '100%' }}>
                <Icon name="check-circle" size={56} color="#10b981" />
                <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '10px', color: '#047857' }}>
                  Device Linked!
                </div>
                <div style={{ fontSize: '12px', color: '#065f46', marginTop: '4px', marginBottom: '16px' }}>
                  Ready to send real bulk messages
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleBridgeLogout}
                  disabled={refreshingQr}
                  style={{ width: '100%', fontSize: '11px', color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                >
                  <Icon name="x-circle" size={13} color="#dc2626" />
                  {refreshingQr ? 'Resetting...' : 'Unlink & Scan Another Device'}
                </button>
              </div>
            ) : bridgeStatus?.qr ? (
              <>
                <img
                  src={bridgeStatus.qr}
                  alt="WhatsApp Web QR Code"
                  style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontWeight: 600 }}>
                  Scan with WhatsApp camera
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleRefreshQr}
                  disabled={refreshingQr}
                  style={{ marginTop: '10px', fontSize: '11px', padding: '4px 10px', width: '100%' }}
                >
                  <Icon name="refresh-cw" size={12} /> {refreshingQr ? 'Refreshing...' : '🔄 Refresh QR Code'}
                </button>
              </>
            ) : (
              <div style={{ color: '#64748b', padding: '24px 12px', width: '100%' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {refreshingQr ? 'Generating QR Code...' : 'QR Code Ready'}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: 1.4 }}>
                  Click below to generate a live QR code and link your phone.
                </p>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleRefreshQr}
                  disabled={refreshingQr}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Icon name="zap" size={14} /> {refreshingQr ? 'Generating...' : 'Generate QR Code Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OTHER CHANNELS: META CLOUD API & GMAIL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Meta Cloud API Card */}
        <div className="glass-panel" style={{ padding: '28px', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <Icon name="whatsapp" size={24} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', color: '#fff' }}>WhatsApp Cloud API</h3>
                <span style={{ fontSize: '12px', color: '#34d399' }}>Official Meta Graph Platform</span>
              </div>
            </div>
            <span className={`badge ${wa?.is_simulated ? 'badge-queued' : 'badge-delivered'}`}>
              {wa?.is_simulated ? 'Simulator Mode' : 'Live API Active'}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
            Official Meta Cloud API using system access tokens and phone number IDs. Best for verified businesses with approved templates.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sender Identifier:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{wa?.account_identifier || '+1 (555) 019-2834'}</span>
            </div>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phone Number ID:</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>{wa?.phone_number_id || 'phone_meta_98124'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Webhook Callback:</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={copyWebhookUrl}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                {copied ? <Icon name="check" size={12} color="#10b981" /> : <Icon name="copy" size={12} />}
                {copied ? 'Copied' : 'Copy Endpoint'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => startEdit('whatsapp')}
            >
              <Icon name="settings" size={13} /> Edit Credentials
            </button>

            <button
              className={`btn ${wa?.is_simulated ? 'btn-whatsapp' : 'btn-secondary'} btn-sm`}
              onClick={() => wa && toggleSimulation(wa.id, wa.is_simulated)}
            >
              {wa?.is_simulated ? 'Switch to Live API' : 'Switch to Simulator'}
            </button>
          </div>
        </div>

        {/* Gmail API / SMTP Card */}
        <div className="glass-panel" style={{ padding: '28px', borderTop: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <Icon name="mail" size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', color: '#fff' }}>Gmail / SMTP API</h3>
                <span style={{ fontSize: '12px', color: '#fca5a5' }}>Direct Google Dispatch</span>
              </div>
            </div>
            <span className={`badge ${gm?.is_simulated ? 'badge-queued' : 'badge-delivered'}`}>
              {gm?.is_simulated ? 'Simulator Mode' : 'Live API Active'}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
            Sends personalized emails straight to real inboxes using Gmail SMTP (with an App Password) or OAuth 2.0 messages.send endpoint.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sending Email:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{gm?.account_identifier || 'team@automessage.app'}</span>
            </div>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Method:</span>
              <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>Gmail App Password / OAuth</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ color: '#10b981' }}>Configured</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => startEdit('gmail')}
            >
              <Icon name="settings" size={13} /> Edit Credentials
            </button>

            <button
              className={`btn ${gm?.is_simulated ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => gm && toggleSimulation(gm.id, gm.is_simulated)}
            >
              {gm?.is_simulated ? 'Switch to Live API' : 'Switch to Simulator'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Credentials Modal */}
      {editingProvider && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setEditingProvider(null)}>
          <div
            className="glass-panel"
            style={{ width: '540px', maxWidth: '90%', padding: '28px', background: '#111420' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff' }}>
                Configure {editingProvider === 'gmail' ? 'Gmail / SMTP' : 'WhatsApp Cloud API'} Credentials
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setEditingProvider(null)}
              >
                <Icon name="x-circle" size={20} />
              </button>
            </div>

            {editingProvider === 'gmail' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Your Gmail Address *
                  </label>
                  <input
                    className="input-field"
                    placeholder="e.g. yourname@gmail.com"
                    value={formFields.account_identifier}
                    onChange={(e) => setFormFields(f => ({ ...f, account_identifier: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Google 16-Char App Password (or OAuth Token) *
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="e.g. abcd efgh ijkl mnop"
                    value={formFields.refresh_token_encrypted}
                    onChange={(e) => setFormFields(f => ({ ...f, refresh_token_encrypted: e.target.value }))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Generated in your Google Account Settings &gt; Security &gt; 2-Step Verification &gt; App Passwords.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    WhatsApp Phone Number (E.164)
                  </label>
                  <input
                    className="input-field"
                    placeholder="e.g. +14155552671"
                    value={formFields.account_identifier}
                    onChange={(e) => setFormFields(f => ({ ...f, account_identifier: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Meta Phone Number ID *
                  </label>
                  <input
                    className="input-field"
                    placeholder="From Meta App Dashboard"
                    value={formFields.phone_number_id}
                    onChange={(e) => setFormFields(f => ({ ...f, phone_number_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    WhatsApp Business Account (WABA) ID
                  </label>
                  <input
                    className="input-field"
                    placeholder="e.g. 1092837465928"
                    value={formFields.waba_id}
                    onChange={(e) => setFormFields(f => ({ ...f, waba_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Meta System User Access Token (Bearer) *
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="EAAG..."
                    value={formFields.access_token_encrypted}
                    onChange={(e) => setFormFields(f => ({ ...f, access_token_encrypted: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingProvider(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveCredentials} disabled={saveLoading}>
                {saveLoading ? 'Saving...' : 'Save & Enable Live Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
