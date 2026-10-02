import React, { useState, useEffect } from 'react';
import { apiUrl } from '../api';
import { Icon } from './Icons';

export const CampaignWizard = ({ setView, openCampaignMonitor }) => {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState('whatsapp'); // 'gmail' or 'whatsapp'
  const [campaignName, setCampaignName] = useState('');
  const [senderIdentity, setSenderIdentity] = useState('');
  const [pastedContactsText, setPastedContactsText] = useState('');
  const [inputMode, setInputMode] = useState('upload');
  
  // Message state
  const [subject, setSubject] = useState('');
  const [templateBody, setTemplateBody] = useState(
    "👋 *Hi {{Full Name}}!*\n\nYour pass for *{{Event Name}}* on *{{Event Date}}* is confirmed.\n📍 Venue: {{Venue}}\n🎟 Pass: #{{Ticket ID}}\n\nPlease present this at check-in.\n\nBest,\n*AutoMessage Ops*"
  );

  // AI Assistant state
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiGoal, setAiGoal] = useState('Invite registered students to our workshop');
  const [aiTone, setAiTone] = useState('professional');
  const [aiLoading, setAiLoading] = useState(false);

  // Recipient source state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [spreadsheetData, setSpreadsheetData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState({});

  // Validation report state
  const [validationReport, setValidationReport] = useState(null);
  const [validating, setValidating] = useState(false);

  // Preview state
  const [previewRowIndex, setPreviewRowIndex] = useState(0);

  // Launch state
  const [complianceAgreed, setComplianceAgreed] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Saved templates
  const [savedTemplates, setSavedTemplates] = useState([]);

  useEffect(() => {
    fetch(apiUrl('/api/templates'))
      .then(res => res.json())
      .then(data => setSavedTemplates(data))
      .catch(console.error);

    fetch(apiUrl('/api/whatsapp-bridge/status'))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'CONNECTED' && data.user) {
          setSenderIdentity('+' + data.user.id);
        }
      })
      .catch(console.error);
  }, []);

  // Update default sender when channel changes
  const handleChannelChange = (newChannel) => {
    setChannel(newChannel);
    if (newChannel === 'gmail') {
      setSenderIdentity('outreach@automessage.app');
      setSubject('Registration Confirmed: {{Event Name}} on {{Event Date}}');
      setTemplateBody(
        "<p>Hello {{Full Name}},</p><p>We are delighted to confirm your registration for <strong>{{Event Name}}</strong> on <strong>{{Event Date}}</strong>.</p><p>Location: <strong>{{Venue}}</strong><br>Ticket ID: <strong>#{{Ticket ID}}</strong></p><p>Best regards,<br>AutoMessage Team</p>"
      );
    } else {
      setSenderIdentity('+1 (555) 019-2834');
      setSubject('');
      setTemplateBody(
        "👋 *Hi {{Full Name}}!*\n\nYour pass for *{{Event Name}}* on *{{Event Date}}* is confirmed.\n📍 Venue: {{Venue}}\n🎟 Pass: #{{Ticket ID}}\n\nBest,\n*AutoMessage Ops*"
      );
    }
  };

  // Download clean CSV template
  const handleDownloadCsvTemplate = () => {
    const csvContent = `data:text/csv;charset=utf-8,Name,Phone,Email,Notes\nCustomer One,+14155552671,customer1@example.com,VIP\nCustomer Two,+919876543210,customer2@example.com,Standard\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "recipients_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse pasted contacts directly
  const handleParsePastedContacts = () => {
    if (!pastedContactsText.trim()) {
      alert('Please enter at least one contact number.');
      return;
    }
    const lines = pastedContactsText.trim().split('\n').map(l => l.replace('\r', ''));
    const rows = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/[,	;|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) return;
      let name = 'Recipient ' + (idx + 1);
      let phone = '';
      let email = '';
      if (parts.length === 1) {
        if (parts[0].includes('@')) { email = parts[0]; } else { phone = parts[0]; }
      } else if (parts.length >= 2) {
        name = parts[0];
        if (parts[1].includes('@')) { email = parts[1]; phone = parts[2] || ''; }
        else { phone = parts[1]; email = parts[2] || ''; }
      }
      rows.push({ 'Name': name, 'Phone': phone, 'Email': email });
    });
    if (rows.length === 0) {
      alert('No valid contacts found in text.');
      return;
    }
    const headers = ['Name', 'Phone', 'Email'];
    setSpreadsheetData({
      headers,
      sample_rows: rows.slice(0, 5),
      all_rows: rows,
      inferred_mapping: { name_column: 'Name', phone_column: 'Phone', email_column: 'Email' }
    });
    setColumnMapping({ name_column: 'Name', phone_column: 'Phone', email_column: 'Email' });
    setUploadedFile({ name: 'Pasted List (' + rows.length + ' contacts)' });
    setStep(4);
  };


  // Upload file handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(apiUrl('/api/campaigns/parse-file'), {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setSpreadsheetData(data);
        setColumnMapping(data.inferred_mapping);
        setStep(4);
      } else {
        const err = await res.json();
        alert('File parsing error: ' + (err.detail || 'Failed to read spreadsheet'));
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Run validation
  const runValidation = async () => {
    setValidating(true);
    try {
      const payload = {
        channel,
        raw_data: spreadsheetData.all_rows,
        column_mapping: columnMapping,
        template_body: templateBody,
        template_subject: subject
      };
      const res = await fetch(apiUrl('/api/campaigns/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const report = await res.json();
        setValidationReport(report);
        setStep(5);
      }
    } catch (err) {
      alert('Validation failed: ' + err.message);
    } finally {
      setValidating(false);
    }
  };

  // AI Assistant generator
  const handleGenerateAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(apiUrl('/api/ai/draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          goal: aiGoal,
          tone: aiTone
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTemplateBody(data.body);
        if (data.subject && channel === 'gmail') {
          setSubject(data.subject);
        }
        setShowAiDrawer(false);
      }
    } catch (err) {
      alert('AI Generation error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Launch campaign
  const handleLaunchCampaign = async () => {
    if (!complianceAgreed) {
      alert('Please confirm you have authorization/consent to contact these recipients.');
      return;
    }
    setLaunching(true);
    try {
      const payload = {
        name: campaignName,
        channel,
        sender_identity: senderIdentity,
        subject: channel === 'gmail' ? subject : undefined,
        template_body: templateBody,
        column_mapping: columnMapping,
        raw_data: spreadsheetData.all_rows,
        source_filename: uploadedFile?.name || 'recipients.csv',
        throttle_delay_sec: 0.7
      };

      const res = await fetch(apiUrl('/api/campaigns'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        openCampaignMonitor(data.id);
      } else {
        let errText = 'Unknown error';
        try {
          const errData = await res.json();
          errText = errData.detail || JSON.stringify(errData);
        } catch {
          errText = await res.text();
        }
        alert('Failed to launch campaign: ' + errText);
      }
    } catch (err) {
      alert('Launch failed: ' + err.message);
    } finally {
      setLaunching(false);
    }
  };

  // Insert variable tag into editor
  const insertVariable = (varName) => {
    setTemplateBody(prev => prev + ` {{${varName}}}`);
  };

  // Render preview
  const getRenderedContent = (rowIndex) => {
    if (!validationReport?.sample_rows?.length) return { renderedBody: templateBody, renderedSubj: subject };
    const row = validationReport.sample_rows[rowIndex] || validationReport.sample_rows[0];
    let b = templateBody;
    let s = subject || '';
    
    // Replace all variable keys
    Object.entries(row.variables || {}).forEach(([k, v]) => {
      b = b.split(`{{${k}}}`).join(v);
      s = s.split(`{{${k}}}`).join(v);
    });
    // Replace fallback name
    if (row.name) {
      b = b.split('{{name}}').join(row.name).split('{{Full Name}}').join(row.name);
      s = s.split('{{name}}').join(row.name).split('{{Full Name}}').join(row.name);
    }
    return { renderedBody: b, renderedSubj: s, row };
  };

  return (
    <div className="page-container">
      {/* Stepper Bar */}
      <div className="glass-panel wizard-stepper" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { num: 1, label: 'Channel' },
            { num: 2, label: 'Message' },
            { num: 3, label: 'Recipients' },
            { num: 4, label: 'Mapping' },
            { num: 5, label: 'Validation' },
            { num: 6, label: 'Preview' },
            { num: 7, label: 'Launch' },
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: step === s.num 
                  ? 'var(--primary)' 
                  : step > s.num 
                    ? '#10b981' 
                    : 'rgba(255,255,255,0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: step === s.num ? '0 0 12px var(--primary-glow)' : 'none'
              }}>
                {step > s.num ? <Icon name="check" size={14} /> : s.num}
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: step === s.num ? 700 : 500,
                color: step === s.num ? '#fff' : 'var(--text-muted)'
              }}>
                {s.label}
              </span>
              {s.num < 7 && <Icon name="chevron-right" size={14} color="rgba(255,255,255,0.2)" />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: CHANNEL SELECTION */}
      {step === 1 && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px' }}>Step 1 — Choose Sending Channel</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
            AutoMessage uses dedicated delivery adapters for each provider. Choose your channel:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* WhatsApp Card */}
            <div
              onClick={() => handleChannelChange('whatsapp')}
              style={{
                padding: '24px',
                borderRadius: '16px',
                cursor: 'pointer',
                border: channel === 'whatsapp' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                background: channel === 'whatsapp' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                boxShadow: channel === 'whatsapp' ? '0 0 24px rgba(16, 185, 129, 0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                  <Icon name="whatsapp" size={24} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#fff' }}>WhatsApp Business</h3>
                  <span style={{ fontSize: '12px', color: '#34d399' }}>Official Cloud API</span>
                </div>
              </div>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: '18px' }}>
                <li>High open rates & mobile push delivery</li>
                <li>Real-time sent, delivered & read webhook receipts</li>
                <li>E.164 phone number auto-normalization</li>
              </ul>
            </div>

            {/* Gmail Card */}
            <div
              onClick={() => handleChannelChange('gmail')}
              style={{
                padding: '24px',
                borderRadius: '16px',
                cursor: 'pointer',
                border: channel === 'gmail' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                background: channel === 'gmail' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                boxShadow: channel === 'gmail' ? '0 0 24px rgba(99, 102, 241, 0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                  <Icon name="mail" size={24} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#fff' }}>Gmail Outreach</h3>
                  <span style={{ fontSize: '12px', color: '#a5b4fc' }}>Authorized OAuth 2.0 API</span>
                </div>
              </div>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: '18px' }}>
                <li>Rich HTML formatting & styled email templates</li>
                <li>MIME Base64URL encoding via messages.send</li>
                <li>Automatic email syntax checks</li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Campaign Name
              </label>
              <input
                className="input-field"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Q4 Executive Summit Invite"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Sender Identity
              </label>
              <input
                className="input-field"
                value={senderIdentity}
                onChange={(e) => setSenderIdentity(e.target.value)}
                placeholder={channel === 'whatsapp' ? '+1 (555) 019-2834' : 'outreach@yourcompany.com'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Next: Compose Message <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: MESSAGE COMPOSER & AI ASSISTANT */}
      {step === 2 && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', color: '#fff' }}>Step 2 — Compose Message Template</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Use variables like <code>{'{{Full Name}}'}</code> or <code>{'{{Event Name}}'}</code> to personalize each message.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAiDrawer(!showAiDrawer)}>
                <Icon name="sparkles" size={14} color="#a855f7" />
                AI Copilot
              </button>
            </div>
          </div>

          {/* AI Drawer */}
          {showAiDrawer && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="sparkles" size={16} /> AutoMessage AI Draft Generator
                </span>
                <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowAiDrawer(false)}>
                  <Icon name="x-circle" size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>What is your goal?</label>
                  <input
                    className="input-field"
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder="e.g. Confirm VIP ticket and pass for summit"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tone</label>
                  <select className="input-field" value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly & Warm</option>
                    <option value="urgent">Urgent Reminder</option>
                    <option value="persuasive">Persuasive</option>
                  </select>
                </div>
              </div>

              <button className="btn btn-primary btn-sm" onClick={handleGenerateAi} disabled={aiLoading}>
                {aiLoading ? <span className="animate-spin">⏳</span> : <Icon name="zap" size={13} />}
                {aiLoading ? 'Synthesizing...' : 'Generate AI Message & Variables'}
              </button>
            </div>
          )}

          {/* Email Subject Line (If Gmail) */}
          {channel === 'gmail' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Email Subject
              </label>
              <input
                className="input-field"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Invitation to {{Event Name}}"
              />
            </div>
          )}

          {/* Quick Variable Insert Pills */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '8px' }}>Insert Variable:</span>
            {['Full Name', 'Event Name', 'Event Date', 'Venue', 'Ticket ID', 'Company', 'Amount'].map(v => (
              <button
                key={v}
                className="btn btn-secondary btn-sm"
                onClick={() => insertVariable(v)}
                style={{ padding: '3px 8px', fontSize: '11px', marginRight: '6px', marginBottom: '6px' }}
              >
                + {`{{${v}}}`}
              </button>
            ))}
          </div>

          {/* Template Body Textarea */}
          <div style={{ marginBottom: '24px' }}>
            <textarea
              className="input-field"
              rows={8}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Formatting: {channel === 'whatsapp' ? 'WhatsApp (*bold*, _italic_)' : 'HTML / Rich Text'}</span>
              <span>{templateBody.length} characters</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Next: Select Recipients <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RECIPIENT SOURCE UPLOAD */}
      {step === 3 && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px' }}>Step 3 — Upload Recipient Spreadsheet</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
            Supported formats: <code>.csv</code> and <code>.xlsx</code>. The platform will automatically detect phone/email and personalize all custom variables.
          </p>

          <div style={{
            border: '2px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(99, 102, 241, 0.03)',
            marginBottom: '24px',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Icon name="upload" size={28} />
              </div>
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '6px' }}>
                {uploadLoading ? 'Reading & Parsing Spreadsheet...' : 'Drop your spreadsheet here or click to browse'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                CSV or XLSX files with recipient details and custom variable columns
              </p>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            <button 
              className={`btn ${inputMode === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setInputMode('upload')}
            >
              <Icon name="upload" size={14} /> Upload Spreadsheet (.csv / .xlsx)
            </button>
            <button 
              className={`btn ${inputMode === 'paste' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setInputMode('paste')}
            >
              <Icon name="edit" size={14} /> Paste Phone Numbers Directly
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadCsvTemplate}
            >
              <Icon name="download" size={14} /> Download Blank CSV Template
            </button>
          </div>

          {inputMode === 'paste' && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                Paste Recipient Numbers (One per line or Name, Phone):
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Example formats:<br />
                <code>+917278283666</code><br />
                <code>John Doe, +14155552671</code>
              </p>
              <textarea
                className="input-field"
                rows={6}
                value={pastedContactsText}
                onChange={(e) => setPastedContactsText(e.target.value)}
                placeholder="+917278283666&#10;+919876543210&#10;Alice, +14155552671"
                style={{ fontFamily: 'monospace', fontSize: '13px', marginBottom: '16px' }}
              />
              <button className="btn btn-whatsapp" onClick={handleParsePastedContacts}>
                <Icon name="arrow-right" size={16} /> Continue with Pasted Contacts ({pastedContactsText.trim() ? pastedContactsText.trim().split('\n').filter(Boolean).length : 0})
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: COLUMN MAPPING */}
      {step === 4 && spreadsheetData && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', color: '#fff' }}>Step 4 — Map Spreadsheet Columns</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                AutoMessage identified likely fields for {spreadsheetData.filename} ({spreadsheetData.row_count} total rows).
              </p>
            </div>
            <span className="badge badge-valid">Auto-Inference Applied</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Primary Channel Identifier */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {channel === 'whatsapp' ? '📱 WhatsApp Phone Number Column *' : '✉️ Recipient Email Address Column *'}
              </label>
              <select
                className="input-field"
                value={channel === 'whatsapp' ? columnMapping.phone || '' : columnMapping.email || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setColumnMapping(prev => ({
                    ...prev,
                    [channel === 'whatsapp' ? 'phone' : 'email']: val
                  }));
                }}
              >
                <option value="">-- Select Column --</option>
                {spreadsheetData.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Required for {channel.toUpperCase()} message delivery
              </span>
            </div>

            {/* Name Column */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                👤 Recipient Name Column
              </label>
              <select
                className="input-field"
                value={columnMapping.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setColumnMapping(prev => ({ ...prev, name: val }));
                }}
              >
                <option value="">-- Select Column --</option>
                {spreadsheetData.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Used for `{'{{Full Name}}'}` and checklist view
              </span>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Spreadsheet Data Preview (Top 3 Rows):</h4>
          <div className="table-responsive" style={{ marginBottom: '32px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {spreadsheetData.headers.slice(0, 6).map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spreadsheetData.sample_rows.slice(0, 3).map((r, i) => (
                  <tr key={i}>
                    {spreadsheetData.headers.slice(0, 6).map(h => (
                      <td key={h}>{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={runValidation} disabled={validating}>
              {validating ? 'Validating Recipients...' : 'Run Pre-Flight Validation'} <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: VALIDATION REPORT */}
      {step === 5 && validationReport && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', color: '#fff' }}>Step 5 — Pre-Flight Validation Report</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Verification results for {channel.toUpperCase()} rules, formatting, duplicates, and variable completeness.
              </p>
            </div>
            {validationReport.invalid_count > 0 ? (
              <span className="badge badge-duplicate">Diagnostic Warnings</span>
            ) : (
              <span className="badge badge-valid">All Rows Verified</span>
            )}
          </div>

          {/* Validation Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Processed</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{validationReport.total_rows}</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase' }}>Ready to Send</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{validationReport.valid_count}</div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '11px', color: '#f87171', textTransform: 'uppercase' }}>Invalid Syntax</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{validationReport.invalid_count}</div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase' }}>Duplicates</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{validationReport.duplicate_count}</div>
            </div>
          </div>

          {/* Diagnostic Row Breakdown */}
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Recipients Inspection:</h4>
          <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '32px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Recipient</th>
                  <th>Identifier</th>
                  <th>Status</th>
                  <th>Diagnostic Notes</th>
                </tr>
              </thead>
              <tbody>
                {validationReport.sample_rows.map(r => (
                  <tr key={r.row_number}>
                    <td>#{r.row_number}</td>
                    <td style={{ fontWeight: 600 }}>{r.name || 'Unnamed'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.identifier || '—'}</td>
                    <td>
                      <span className={`badge ${
                        r.status === 'VALID' ? 'badge-valid' :
                        r.status === 'DUPLICATE' ? 'badge-duplicate' : 'badge-failed'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: r.error ? '#f87171' : 'var(--text-muted)' }}>
                      {r.error || 'Syntax and parameters valid'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(4)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(6)}>
              Next: Personalized Preview <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: PERSONALIZED PREVIEW */}
      {step === 6 && validationReport && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', color: '#fff' }}>Step 6 — Live Personalized Preview</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Preview how the personalized template renders for each recipient.
              </p>
            </div>
            {/* Recipient switcher pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={previewRowIndex <= 0}
                onClick={() => setPreviewRowIndex(p => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Recipient {previewRowIndex + 1} of {validationReport.sample_rows.length}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={previewRowIndex >= validationReport.sample_rows.length - 1}
                onClick={() => setPreviewRowIndex(p => Math.min(validationReport.sample_rows.length - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>

          {/* Rendered Preview Card */}
          {(() => {
            const { renderedBody, renderedSubj, row } = getRenderedContent(previewRowIndex);
            return (
              <div style={{
                background: channel === 'whatsapp' ? '#0b141a' : '#1e2438',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '32px',
                maxWidth: '680px',
                margin: '0 auto 32px auto'
              }}>
                {/* Channel Header Simulation */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: channel === 'whatsapp' ? '#10b981' : '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700
                  }}>
                    {row?.name ? row.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                      {row?.name || 'Preview Recipient'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {row?.identifier || 'No identifier mapped'}
                    </div>
                  </div>
                </div>

                {channel === 'gmail' && (
                  <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subject: </span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{renderedSubj}</span>
                  </div>
                )}

                {/* Message Content */}
                <div style={{
                  background: channel === 'whatsapp' ? '#005c4b' : 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  borderRadius: channel === 'whatsapp' ? '0 12px 12px 12px' : '8px',
                  padding: '16px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }} dangerouslySetInnerHTML={{ __html: renderedBody.replace(/\n/g, '<br/>') }} />
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(5)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(7)}>
              Next: Launch Confirmation <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: LAUNCH CONFIRMATION */}
      {step === 7 && validationReport && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px' }}>Step 7 — Launch Campaign</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
            Review final parameters and compliance checklist before submitting to the background queue.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Campaign Name:</span>
                <div style={{ fontWeight: 700, color: '#fff', marginTop: '2px' }}>{campaignName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Channel:</span>
                <div style={{ fontWeight: 700, color: channel === 'whatsapp' ? '#10b981' : '#818cf8', marginTop: '2px' }}>
                  {channel.toUpperCase()} (Cloud Adapter)
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Recipients to Queue:</span>
                <div style={{ fontWeight: 700, color: '#10b981', marginTop: '2px' }}>{validationReport.valid_count} Messages</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Sending Rate:</span>
                <div style={{ fontWeight: 700, color: '#fff', marginTop: '2px' }}>~1 message / 0.7 sec</div>
              </div>
            </div>
          </div>

          {/* Compliance Checkbox */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={complianceAgreed}
                onChange={(e) => setComplianceAgreed(e.target.checked)}
                style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                <strong>Compliance & Anti-Spam Confirmation:</strong> I confirm that I have an authorized relationship with these recipients, 
                and that sending complies with Meta's WhatsApp Business Messaging Policy and Google Gmail usage guidelines.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(6)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
            <button
              className={channel === 'whatsapp' ? 'btn btn-whatsapp' : 'btn btn-primary'}
              onClick={handleLaunchCampaign}
              disabled={launching || !complianceAgreed}
            >
              {launching ? 'Deploying to Queue...' : '🚀 Start Campaign & Open Cockpit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
