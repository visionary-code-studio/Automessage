import React, { useState } from 'react';
import { Icon } from './Icons';

export const Navbar = ({ currentView, setView, activeCampaignId }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view) => {
    setView(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(9, 10, 16, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Brand */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => handleNavClick('dashboard')}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            <Icon name="send" size={18} color="#fff" />
          </div>
          <div>
            <span className="brand-font" style={{ fontSize: '18px', color: '#fff', fontWeight: 800 }}>
              Auto<span style={{ color: '#6366f1' }}>Message</span>
            </span>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Bulk Messaging Engine
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleNavClick('dashboard')}
          >
            <Icon name="activity" size={14} />
            Dashboard
          </button>

          <button
            className={`btn ${currentView === 'wizard' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleNavClick('wizard')}
          >
            <Icon name="plus" size={14} />
            New Campaign
          </button>

          {activeCampaignId && (
            <button
              className={`btn ${currentView === 'monitor' ? 'btn-whatsapp' : 'btn-secondary'} btn-sm`}
              onClick={() => handleNavClick('monitor')}
              style={{ position: 'relative' }}
            >
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse-ring 1.5s infinite',
                marginRight: '2px'
              }} />
              Live Cockpit
            </button>
          )}

          <button
            className={`btn ${currentView === 'templates' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleNavClick('templates')}
          >
            <Icon name="layers" size={14} />
            Templates
          </button>

          <button
            className={`btn ${currentView === 'integrations' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleNavClick('integrations')}
          >
            <Icon name="settings" size={14} />
            Channels
          </button>
        </div>

        {/* Provider Status Badges (Desktop) */}
        <div className="desktop-badges" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '9999px',
            fontSize: '11px',
            color: '#6ee7b7'
          }}>
            <Icon name="whatsapp" size={12} color="#10b981" />
            <span>WhatsApp Ready</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '9999px',
            fontSize: '11px',
            color: '#fca5a5'
          }}>
            <Icon name="mail" size={12} color="#ef4444" />
            <span>Gmail</span>
          </div>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <Icon name={mobileMenuOpen ? "x-circle" : "layers"} size={20} />
        </button>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-menu">
          <button
            className={`btn ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <Icon name="activity" size={16} />
            Dashboard
          </button>

          <button
            className={`btn ${currentView === 'wizard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleNavClick('wizard')}
          >
            <Icon name="plus" size={16} />
            New Campaign
          </button>

          {activeCampaignId && (
            <button
              className={`btn ${currentView === 'monitor' ? 'btn-whatsapp' : 'btn-secondary'}`}
              onClick={() => handleNavClick('monitor')}
            >
              <Icon name="zap" size={16} />
              Live Cockpit
            </button>
          )}

          <button
            className={`btn ${currentView === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleNavClick('templates')}
          >
            <Icon name="layers" size={16} />
            Message Templates
          </button>

          <button
            className={`btn ${currentView === 'integrations' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleNavClick('integrations')}
          >
            <Icon name="settings" size={16} />
            WhatsApp & Channels
          </button>
        </div>
      )}
    </>
  );
};
