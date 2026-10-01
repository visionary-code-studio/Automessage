import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CampaignWizard } from './components/CampaignWizard';
import { CampaignMonitor } from './components/CampaignMonitor';
import { IntegrationsHub } from './components/IntegrationsHub';
import { TemplatesView } from './components/TemplatesView';

export function App() {
  const [currentView, setView] = useState('dashboard'); // 'dashboard', 'wizard', 'monitor', 'integrations', 'templates'
  const [activeCampaignId, setActiveCampaignId] = useState(null);

  const openCampaignMonitor = (campaignId) => {
    setActiveCampaignId(campaignId);
    setView('monitor');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)',
        background: 'rgba(9, 10, 16, 0.95)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', maxWidth: '1280px', margin: '0 auto' }}>
          <div>
            AutoMessage™ • Channel-Agnostic Bulk Campaign Operating Layer (Gmail API & WhatsApp Cloud Platform)
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Privacy Compliant</span>
            <span>E.164 Standard</span>
            <span>MIME RFC 2822</span>
            <span>Meta Webhook Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
