import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../api';
import { Icon } from './Icons';

export const IntegrationsHub = ({ setView }) => {
  const [integrations, setIntegrations] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);

  // WhatsApp QR Code Bridge state
  const [bridgeStatus, setBridgeStatus] = useState(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const prevStatusRef = useRef(null);

  // Form states for editing credentials modal
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
  const [statusNotice, setStatusNotice] = useState('');

  // Live simulator state toggle
  const [waLiveActive, setWaLiveActive] = useState(true);
  const [gmailLiveActive, setGmailLiveActive] = useState(true);

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
        
        // Auto pop modal when status transitions to CONNECTED
        if (data.status === 'CONNECTED' && prevStatusRef.current !== 'CONNECTED') {
          setShowVerifiedModal(true);
        }
        prevStatusRef.current = data.status;
        setBridgeStatus(data);
      }
    } catch (err) {
      if (!bridgeStatus) {
        setBridgeStatus({ status: 'SCAN_QR' });
      }
    } finally {
      setBridgeLoading(false);
    }
  };

  // Explicit QR Refresh
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
      setTimeout(() => setRefreshingQr(false), 800);
    }
  };

  // Change QR / Scan Again: Resets session and presents fresh QR code
  const handleResetBridge = async () => {
    setRefreshingQr(true);
    setShowVerifiedModal(false);
    try {
      const res = await fetch(apiUrl('/api/whatsapp-bridge/reset'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        prevStatusRef.current = 'SCAN_QR';
        setBridgeStatus(data?.qr ? data : { status: 'SCAN_QR', qr: null, user: null });
      } else {
        prevStatusRef.current = 'SCAN_QR';
        setBridgeStatus({ status: 'SCAN_QR', qr: null, user: null });
      }
      setStatusNotice('QR session unlinked. Ready to scan new device.');
      setTimeout(() => setStatusNotice(''), 4000);
      await fetchIntegrations();
    } catch (err) {
      console.error('Error resetting bridge:', err);
      prevStatusRef.current = 'SCAN_QR';
      setBridgeStatus({ status: 'SCAN_QR', qr: null, user: null });
    } finally {
      setRefreshingQr(false);
    }
  };

  // Immediate Simulation / Test Verification
  const handleSimulateVerification = () => {
    const mockUser = { id: '919876543210', name: 'Demo Verified WhatsApp' };
    prevStatusRef.current = 'CONNECTED';
    setBridgeStatus({
      status: 'CONNECTED',
      user: mockUser,
      qr: null,
      has_session: true
    });
    setShowVerifiedModal(true);
  };

  useEffect(() => {
    fetchIntegrations();
    fetchBridgeStatus();
    const interval = setInterval(fetchBridgeStatus, 3500);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const startEdit = (provider) => {
    const item = integrations.find(i => i.provider === provider);
    setEditingProvider(provider);
    if (item) {
      setFormFields({
        account_identifier: item.account_identifier && item.account_identifier !== 'Not configured' ? item.account_identifier : '',
        phone_number_id: item.phone_number_id || '',
        waba_id: item.waba_id || '',
        access_token_encrypted: item.access_token_encrypted || item.refresh_token_encrypted || '',
        refresh_token_encrypted: item.refresh_token_encrypted || item.access_token_encrypted || ''
      });
    } else {
      setFormFields({
        account_identifier: provider === 'whatsapp' ? 'AutoMessage' : '',
        phone_number_id: '123456789012345',
        waba_id: '',
        access_token_encrypted: '',
        refresh_token_encrypted: ''
      });
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    const item = integrations.find(i => i.provider === editingProvider);
    const targetId = item ? item.id : (editingProvider === 'gmail' ? 'int_gmail_default' : 'int_wa_default');
    
    const secretVal = (formFields.access_token_encrypted || formFields.refresh_token_encrypted || '').trim();
    const payload = {
      account_identifier: (formFields.account_identifier || '').trim(),
      phone_number_id: formFields.phone_number_id,
      waba_id: formFields.waba_id,
      access_token_encrypted: secretVal,
      refresh_token_encrypted: secretVal,
      is_connected: 1,
      is_simulated: 0
    };

    try {
      const res = await fetch(apiUrl(`/api/integrations/${targetId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Credentials saved successfully! Real email sending is now active.');
        setEditingProvider(null);
        await fetchIntegrations();
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Failed to save credentials: ' + (err.detail || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving credentials: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const wa = integrations.find(i => i.provider === 'whatsapp');
  const gm = integrations.find(i => i.provider === 'gmail');

  const isConnected = bridgeStatus?.status === 'CONNECTED';
  const connectedNumber = bridgeStatus?.user?.id 
    ? (bridgeStatus.user.id.startsWith('+') ? bridgeStatus.user.id : `+${bridgeStatus.user.id}`)
    : (wa?.account_identifier && wa.account_identifier.startsWith('+') ? wa.account_identifier : '+91 98765 43210');
  const connectedName = bridgeStatus?.user?.name || 'Verified WhatsApp Session';

  return (
    <div className="page-container">
      {/* HEADER MATCHING IMAGE 4 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Channel Delivery <span style={{ color: '#6366f1' }}>Integrations</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '720px' }}>
            Connect and configure your sending channels to deliver campaigns via WhatsApp (Meta Cloud API / Web) and Gmail (SMTP / API).
          </p>
        </div>

        {/* Decorative script annotation matching Image 4 */}
        <div style={{
          textAlign: 'right',
          fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive, sans-serif",
          color: '#a5b4fc',
          fontSize: '22px',
          lineHeight: 1.15,
          transform: 'rotate(-4deg)',
          textShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
          userSelect: 'none'
        }}>
          One Platform<br />
          Two Powerful Channels
        </div>
      </div>

      {statusNotice && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          color: '#34d399',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Icon name="check" size={16} />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* FEATURED: WHATSAPP WEB QR CODE LINKER (TOP CARD MATCHING IMAGE 4) */}
      <div className="glass-panel" style={{
        padding: '32px 36px',
        marginBottom: '28px',
        border: isConnected ? '1.5px solid #10b981' : '1.5px solid #10b981',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(11, 15, 26, 0.95) 100%)',
        boxShadow: isConnected ? '0 0 32px rgba(16, 185, 129, 0.3)' : '0 0 28px rgba(16, 185, 129, 0.22)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px'
      }}>
        {/* Large Faint WhatsApp Logo Watermark */}
        <div style={{
          position: 'absolute',
          right: '320px',
          bottom: '-10px',
          opacity: 0.12,
          pointerEvents: 'none',
          color: '#10b981'
        }}>
          <Icon name="whatsapp" size={130} color="#10b981" />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(260px, 320px)',
          gap: '36px',
          alignItems: 'center'
        }}>
          {/* Left Instructions / Verified Column */}
          <div style={{ zIndex: 1 }}>
            {/* Top Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#38bdf8',
                letterSpacing: '0.04em'
              }}>
                <Icon name="zap" size={12} color="#38bdf8" />
                <span>ALTERNATE 1 • ZERO META SETUP</span>
              </div>

              {isConnected ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#34d399',
                  letterSpacing: '0.04em',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
                }}>
                  <span className="pulse-dot-green" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span>VERIFIED & CONNECTED</span>
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#34d399',
                  letterSpacing: '0.04em'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span>READY TO SCAN</span>
                </div>
              )}
            </div>

            {/* Title with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <Icon name="whatsapp" size={24} color="#10b981" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                WhatsApp Web QR Code Linker
              </h2>
            </div>

            {/* Description */}
            <p style={{ color: '#94a3b8', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '22px' }}>
              {isConnected
                ? 'Your WhatsApp Web session is verified and securely active. AutoMessage can now automate your bulk campaigns directly through your authenticated WhatsApp account.'
                : 'Use your personal or business WhatsApp account via WhatsApp Web to quickly start sending messages. No Meta approval needed. Ideal for small campaigns and testing.'}
            </p>

            {/* Conditional Left Box: Verified Overview OR How to link instructions */}
            {isConnected ? (
              <div style={{
                background: 'rgba(7, 10, 18, 0.75)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '14px',
                padding: '18px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Verified Phone:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>
                    {connectedNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Session Name:</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                    {connectedName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Dispatch Authorization:</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon name="check" size={13} color="#10b981" /> Bulk Messaging Ready
                  </span>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(7, 10, 18, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px 20px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
                  How to link your phone:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: '#cbd5e1' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      1
                    </div>
                    <span>Open WhatsApp on your phone</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: '#cbd5e1' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      2
                    </div>
                    <span>Tap on Settings (Android) or three dots (iPhone)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: '#cbd5e1' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      3
                    </div>
                    <span>Go to Linked Devices</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: '#cbd5e1' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      4
                    </div>
                    <span>Tap on Link a Device and scan the QR code</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Card: VERIFIED STATE CARD or SCANNING QR CODE CARD */}
          {isConnected ? (
            /* VERIFIED STATE CARD */
            <div style={{
              background: '#0d1322',
              border: '1.5px solid #10b981',
              borderRadius: '18px',
              padding: '28px 22px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              position: 'relative'
            }}>
              {/* Glowing Verified Graphic */}
              <div style={{
                position: 'relative',
                width: '74px',
                height: '74px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.18)',
                  boxShadow: '0 0 25px rgba(16, 185, 129, 0.45)'
                }} />
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  zIndex: 1
                }}>
                  <Icon name="check" size={28} />
                </div>
              </div>

              <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                QR Verified & Linked
              </h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>
                Active on <span style={{ color: '#34d399', fontWeight: 700 }}>{connectedNumber}</span>
              </p>

              {/* ACTION BUTTONS: CHANGE QR & AUTOMATE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button
                  className="btn btn-whatsapp-solid"
                  onClick={() => {
                    if (setView) setView('wizard');
                    else window.location.hash = 'wizard';
                  }}
                  style={{ width: '100%', padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}
                >
                  <Icon name="send" size={15} />
                  <span>Automate Bulk Messages</span>
                </button>

                {/* Option to change QR by scanning again */}
                <button
                  className="btn btn-secondary"
                  onClick={handleResetBridge}
                  disabled={refreshingQr}
                  style={{ width: '100%', padding: '9px 16px', fontSize: '12.5px', color: '#cbd5e1' }}
                >
                  <Icon name="refresh-cw" size={14} className={refreshingQr ? 'animate-spin' : ''} />
                  <span>{refreshingQr ? 'Unlinking...' : 'Change QR / Scan Again'}</span>
                </button>

                <button
                  onClick={() => setShowVerifiedModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    padding: '4px',
                    textDecoration: 'underline'
                  }}
                >
                  View Verification Receipt
                </button>
              </div>
            </div>
          ) : (
            /* SCANNING QR CODE CARD MATCHING IMAGE 4 */
            <div style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '24px 20px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              position: 'relative'
            }}>
              {/* Target Viewfinder Brackets around QR */}
              <div style={{
                position: 'relative',
                width: '180px',
                height: '180px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                {/* Corner Viewfinder brackets (green) */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '22px', height: '22px', borderTop: '3px solid #10b981', borderLeft: '3px solid #10b981', borderTopLeftRadius: '6px' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: '22px', height: '22px', borderTop: '3px solid #10b981', borderRight: '3px solid #10b981', borderTopRightRadius: '6px' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '22px', height: '22px', borderBottom: '3px solid #10b981', borderLeft: '3px solid #10b981', borderBottomLeftRadius: '6px' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', borderBottom: '3px solid #10b981', borderRight: '3px solid #10b981', borderBottomRightRadius: '6px' }} />

                {/* QR Image */}
                {bridgeStatus?.qr ? (
                  <img
                    src={bridgeStatus.qr}
                    alt="WhatsApp QR Code"
                    style={{ width: '150px', height: '150px', display: 'block', borderRadius: '4px' }}
                  />
                ) : (
                  /* Crisp High-Res Vector QR Code matching Image 4 */
                  <svg width="150" height="150" viewBox="0 0 100 100" fill="#0f172a">
                    {/* Top-Left Position Square */}
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="12" y="12" width="12" height="12" rx="2" fill="#0f172a" />

                    {/* Top-Right Position Square */}
                    <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="76" y="12" width="12" height="12" rx="2" fill="#0f172a" />

                    {/* Bottom-Left Position Square */}
                    <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="12" y="76" width="12" height="12" rx="2" fill="#0f172a" />

                    {/* QR Matrix Bits */}
                    <rect x="36" y="8" width="6" height="6" />
                    <rect x="46" y="8" width="6" height="6" />
                    <rect x="56" y="8" width="6" height="6" />
                    <rect x="36" y="18" width="6" height="6" />
                    <rect x="46" y="24" width="6" height="6" />
                    <rect x="56" y="18" width="6" height="6" />

                    <rect x="8" y="36" width="6" height="6" />
                    <rect x="18" y="46" width="6" height="6" />
                    <rect x="24" y="36" width="6" height="6" />
                    <rect x="8" y="56" width="6" height="6" />

                    <rect x="36" y="36" width="6" height="6" />
                    <rect x="46" y="36" width="6" height="6" />
                    <rect x="56" y="36" width="6" height="6" />
                    <rect x="40" y="46" width="16" height="6" />
                    <rect x="36" y="56" width="6" height="6" />
                    <rect x="56" y="56" width="6" height="6" />

                    <rect x="68" y="36" width="6" height="6" />
                    <rect x="78" y="46" width="6" height="6" />
                    <rect x="86" y="36" width="6" height="6" />
                    <rect x="68" y="56" width="6" height="6" />

                    <rect x="36" y="68" width="6" height="6" />
                    <rect x="46" y="78" width="6" height="6" />
                    <rect x="56" y="68" width="6" height="6" />
                    <rect x="46" y="86" width="6" height="6" />
                    <rect x="68" y="76" width="6" height="6" />
                    <rect x="80" y="70" width="6" height="6" />
                    <rect x="74" y="86" width="6" height="6" />
                    <rect x="86" y="80" width="6" height="6" />
                  </svg>
                )}
              </div>

              {/* Scan text with Camera Icon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '6px'
              }}>
                <Icon name="camera" size={14} color="#059669" />
                <span>Scan with WhatsApp camera</span>
              </div>

              {/* Info note */}
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '11px' }}>ℹ</span>
                <span>This is a secure QR code for WhatsApp Web</span>
              </div>

              {/* Helper Buttons: Refresh QR & Test Instant Verification */}
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  onClick={handleRefreshQr}
                  disabled={refreshingQr}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Icon name="refresh-cw" size={12} className={refreshingQr ? 'animate-spin' : ''} />
                  <span>Refresh QR</span>
                </button>

                <button
                  onClick={handleSimulateVerification}
                  style={{
                    flex: 1.3,
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '8px',
                    border: '1px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  title="Simulate successful verification to test the pop-up modal"
                >
                  <Icon name="zap" size={12} color="#059669" />
                  <span>Test QR Verified</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TWO CARDS (SIDE-BY-SIDE MATCHING IMAGE 4) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* CARD 1: WHATSAPP CLOUD API */}
        <div className="glass-panel" style={{
          padding: '28px 32px',
          borderRadius: '18px',
          border: '1.5px solid #10b981',
          background: 'rgba(12, 16, 27, 0.85)',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <Icon name="whatsapp" size={24} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>WhatsApp Cloud API</h3>
                <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>Official Meta Cloud Platform</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: '0.04em'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>LIVE API ACTIVE</span>
            </div>
          </div>

          {/* Description */}
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, marginBottom: '22px' }}>
            Use the official WhatsApp Cloud API for scalable, reliable and production-ready message delivery. Best for business campaigns.
          </p>

          {/* Key Value Items with Copy Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '26px' }}>
            {/* Sender Identifier */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                <Icon name="user" size={15} color="#64748b" />
                <span>Sender Identifier</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                  {wa?.account_identifier || 'AutoMessage'}
                </span>
                <button
                  onClick={() => copyToClipboard(wa?.account_identifier || 'AutoMessage', 'wa-id')}
                  style={{ background: 'none', border: 'none', color: copiedKey === 'wa-id' ? '#10b981' : '#64748b', cursor: 'pointer', padding: '2px' }}
                >
                  <Icon name={copiedKey === 'wa-id' ? "check" : "copy"} size={14} color={copiedKey === 'wa-id' ? '#10b981' : '#64748b'} />
                </button>
              </div>
            </div>

            {/* Phone Number ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                <Icon name="activity" size={15} color="#64748b" />
                <span>Phone Number ID</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#cbd5e1' }}>
                  {wa?.phone_number_id && wa.phone_number_id !== 'baileys_session' ? wa.phone_number_id : '123456789012345'}
                </span>
                <button
                  onClick={() => copyToClipboard('123456789012345', 'wa-phone')}
                  style={{ background: 'none', border: 'none', color: copiedKey === 'wa-phone' ? '#10b981' : '#64748b', cursor: 'pointer', padding: '2px' }}
                >
                  <Icon name={copiedKey === 'wa-phone' ? "check" : "copy"} size={14} color={copiedKey === 'wa-phone' ? '#10b981' : '#64748b'} />
                </button>
              </div>
            </div>

            {/* Webhook Callback */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                <Icon name="zap" size={15} color="#64748b" />
                <span>Webhook Callback</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', color: '#38bdf8' }}>
                  https://api.automessage.in/webhook
                </span>
                <button
                  onClick={() => copyToClipboard('https://api.automessage.in/webhook', 'wa-hook')}
                  style={{ background: 'none', border: 'none', color: copiedKey === 'wa-hook' ? '#10b981' : '#64748b', cursor: 'pointer', padding: '2px' }}
                >
                  <Icon name={copiedKey === 'wa-hook' ? "check" : "copy"} size={14} color={copiedKey === 'wa-hook' ? '#10b981' : '#64748b'} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => startEdit('whatsapp')}
              style={{ flex: 1, padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}
            >
              <Icon name="settings" size={14} />
              <span>Edit Credentials</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setWaLiveActive(!waLiveActive)}
              style={{ flex: 1, padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}
            >
              <Icon name="switch" size={14} />
              <span>{waLiveActive ? 'Switch to Simulator' : 'Switch to Live'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: GMAIL / SMTP API */}
        <div className="glass-panel" style={{
          padding: '28px 32px',
          borderRadius: '18px',
          border: '1.5px solid #ef4444',
          background: 'rgba(12, 16, 27, 0.85)',
          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.15)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <Icon name="mail" size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Gmail / SMTP API</h3>
                <span style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 600 }}>Direct Google Dispatch</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: '0.04em'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>LIVE API ACTIVE</span>
            </div>
          </div>

          {/* Description */}
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, marginBottom: '22px' }}>
            Send personalized emails via Gmail API or SMTP with rich HTML templates. Ideal for outreach, notifications and bulk campaigns.
          </p>

          {/* Key Value Items with Copy Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '26px' }}>
            {/* Sending Email */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                <Icon name="mail" size={15} color="#64748b" />
                <span>Sending Email</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                  {gm?.account_identifier && gm.account_identifier !== 'Not configured' ? gm.account_identifier : 'yourname@gmail.com'}
                </span>
                <button
                  onClick={() => copyToClipboard('yourname@gmail.com', 'gm-email')}
                  style={{ background: 'none', border: 'none', color: copiedKey === 'gm-email' ? '#10b981' : '#64748b', cursor: 'pointer', padding: '2px' }}
                >
                  <Icon name={copiedKey === 'gm-email' ? "check" : "copy"} size={14} color={copiedKey === 'gm-email' ? '#10b981' : '#64748b'} />
                </button>
              </div>
            </div>

            {/* Auth Method */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                <Icon name="shield-check" size={15} color="#64748b" />
                <span>Auth Method</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  OAuth 2.0 / App Password
                </span>
                <button
                  onClick={() => copyToClipboard('OAuth 2.0', 'gm-auth')}
                  style={{ background: 'none', border: 'none', color: copiedKey === 'gm-auth' ? '#10b981' : '#64748b', cursor: 'pointer', padding: '2px' }}
                >
                  <Icon name={copiedKey === 'gm-auth' ? "check" : "copy"} size={14} color={copiedKey === 'gm-auth' ? '#10b981' : '#64748b'} />
                </button>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                <Icon name="layers" size={15} color="#64748b" />
                <span>Status</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Configured
                </span>
                <button
                  onClick={() => copyToClipboard('Configured', 'gm-status')}
                  style={{ background: 'none', border: 'none', color: copiedKey === 'gm-status' ? '#10b981' : '#64748b', cursor: 'pointer', padding: '2px' }}
                >
                  <Icon name={copiedKey === 'gm-status' ? "check" : "copy"} size={14} color={copiedKey === 'gm-status' ? '#10b981' : '#64748b'} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => startEdit('gmail')}
              style={{ flex: 1, padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}
            >
              <Icon name="settings" size={14} />
              <span>Edit Credentials</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setGmailLiveActive(!gmailLiveActive)}
              style={{ flex: 1, padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}
            >
              <Icon name="switch" size={14} />
              <span>{gmailLiveActive ? 'Switch to Simulator' : 'Switch to Live'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* WHATSAPP QR CODE VERIFIED POP-UP MODAL */}
      {showVerifiedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }} onClick={() => setShowVerifiedModal(false)}>
          <div
            className="animate-modal-in"
            style={{
              background: 'linear-gradient(135deg, rgba(13, 20, 35, 0.98) 0%, rgba(9, 13, 24, 0.99) 100%)',
              border: '1.5px solid #10b981',
              borderRadius: '24px',
              padding: '36px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(16, 185, 129, 0.35)',
              position: 'relative',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close 'X' Button in corner */}
            <button
              onClick={() => setShowVerifiedModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <Icon name="x-circle" size={18} />
            </button>

            {/* Glowing Success Icon with Pulse Rings */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)'
              }} />
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.6)',
                zIndex: 1
              }}>
                <Icon name="check" size={38} />
              </div>
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              WhatsApp Web QR Verified!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
              Your WhatsApp account has been successfully linked and authenticated. You can now easily automate and dispatch bulk messages without Meta Cloud setup.
            </p>

            {/* Verified Details Box */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '26px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Verified Account:</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                  {connectedNumber}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Session State:</span>
                <span style={{ fontSize: '12.5px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Authenticated & Online
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Protocol:</span>
                <span style={{ fontSize: '12.5px', color: '#cbd5e1' }}>Direct Baileys Multi-Device Web</span>
              </div>
            </div>

            {/* Action Buttons: Automate Bulk Messages, Change QR by Scanning Again, Close */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-whatsapp-solid"
                onClick={() => {
                  setShowVerifiedModal(false);
                  if (setView) setView('wizard');
                  else window.location.hash = 'wizard';
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  borderRadius: '12px'
                }}
              >
                <Icon name="send" size={17} />
                <span>Start Automating Bulk Messages</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleResetBridge}
                disabled={refreshingQr}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '13.5px',
                  borderRadius: '12px',
                  color: '#cbd5e1'
                }}
              >
                <Icon name="refresh-cw" size={15} className={refreshingQr ? 'animate-spin' : ''} />
                <span>Change QR / Scan Another Device</span>
              </button>

              <button
                onClick={() => setShowVerifiedModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                Keep Active & Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CREDENTIALS MODAL */}
      {editingProvider && (
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
        }} onClick={() => setEditingProvider(null)}>
          <div style={{
            background: 'rgba(14, 18, 30, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '18px',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                Edit {editingProvider === 'whatsapp' ? 'WhatsApp Cloud API' : 'Gmail'} Credentials
              </h3>
              <button
                onClick={() => setEditingProvider(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <Icon name="x-circle" size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials}>
              {editingProvider === 'whatsapp' ? (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Sender Identifier</label>
                    <input
                      className="input-field"
                      value={formFields.account_identifier}
                      onChange={(e) => setFormFields({ ...formFields, account_identifier: e.target.value })}
                      placeholder="e.g. AutoMessage"
                    />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Phone Number ID</label>
                    <input
                      className="input-field"
                      value={formFields.phone_number_id}
                      onChange={(e) => setFormFields({ ...formFields, phone_number_id: e.target.value })}
                      placeholder="e.g. 123456789012345"
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Meta Access Token</label>
                    <input
                      type="password"
                      className="input-field"
                      value={formFields.access_token_encrypted}
                      onChange={(e) => setFormFields({ ...formFields, access_token_encrypted: e.target.value })}
                      placeholder="EAAG..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Sending Gmail Address</label>
                    <input
                      className="input-field"
                      required
                      value={formFields.account_identifier}
                      onChange={(e) => setFormFields({ ...formFields, account_identifier: e.target.value })}
                      placeholder="yourname@gmail.com"
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                        Google 16-Char App Password (or OAuth Token)
                      </label>
                      <span style={{ fontSize: '11px', color: '#10b981' }}>16 characters</span>
                    </div>
                    <input
                      type="password"
                      className="input-field"
                      required
                      value={formFields.access_token_encrypted}
                      onChange={(e) => setFormFields({ ...formFields, access_token_encrypted: e.target.value })}
                      placeholder="e.g. abcd efgh ijkl mnop"
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                      Generated from Google Account &gt; Security &gt; App Passwords. Spaces are automatically handled.
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProvider(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
