import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CampaignWizard } from './components/CampaignWizard';
import { CampaignMonitor } from './components/CampaignMonitor';
import { IntegrationsHub } from './components/IntegrationsHub';
import { TemplatesView } from './components/TemplatesView';
import { Icon } from './components/Icons';

export function App() {
  const [currentView, setViewState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'channels') return 'integrations';
    if (['dashboard', 'wizard', 'monitor', 'integrations', 'templates'].includes(hash)) {
      return hash;
    }
    return 'dashboard';
  });
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [preloadedTemplate, setPreloadedTemplate] = useState(null);

  const setView = (v) => {
    setViewState(v);
    window.location.hash = v === 'integrations' ? 'channels' : v;
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'channels') {
        setViewState('integrations');
      } else if (['dashboard', 'wizard', 'monitor', 'integrations', 'templates'].includes(hash)) {
        setViewState(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openCampaignMonitor = (campaignId) => {
    setActiveCampaignId(campaignId);
    setView('monitor');
  };

  const handleUseTemplate = (template) => {
    setPreloadedTemplate(template);
    setView('wizard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar
        currentView={currentView}
        setView={setView}
        activeCampaignId={activeCampaignId}
      />

      <main style={{ flex: 1 }}>
        {currentView === 'dashboard' && (
          <Dashboard
            setView={setView}
            openCampaignMonitor={openCampaignMonitor}
          />
        )}

        {currentView === 'wizard' && (
          <CampaignWizard
            setView={setView}
            openCampaignMonitor={openCampaignMonitor}
            preloadedTemplate={preloadedTemplate}
            clearPreloadedTemplate={() => setPreloadedTemplate(null)}
          />
        )}

        {currentView === 'monitor' && (
          <CampaignMonitor
            campaignId={activeCampaignId}
            setView={setView}
          />
        )}

        {currentView === 'integrations' && (
          <IntegrationsHub />
        )}

        {currentView === 'templates' && (
          <TemplatesView
            setView={setView}
            onUseTemplate={handleUseTemplate}
          />
        )}
      </main>

      {/* Footer matching reference images */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        padding: '24px 32px',
        fontSize: '12px',
        color: '#64748b',
        background: 'rgba(7, 9, 14, 0.95)',
        marginTop: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          maxWidth: '1280px',
          margin: '0 auto'
        }}>
          {/* Left Brand & Slogan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #00d2ff 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="automessage-logo" size={24} />
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: '12px' }}>
                <strong style={{ color: '#fff' }}>AutoMessage™</strong> • Channel-Agnostic Bulk Campaign Operating Layer
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                Send Smarter. Reach Everywhere.
              </div>
            </div>
          </div>

          {/* Right Compliance Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
              <Icon name="shield-check" size={14} color="#64748b" />
              <span>Privacy Compliant</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
              <Icon name="globe" size={14} color="#64748b" />
              <span>E.164 Standard</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
              <Icon name="file-text" size={14} color="#64748b" />
              <span>MIME RFC 2822</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
              <Icon name="meta" size={14} color="#64748b" />
              <span>Meta Webhook Verified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
