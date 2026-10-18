import React, { useState } from 'react';
import { Icon } from './Icons';

export const Navbar = ({ currentView, setView }) => {
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
        padding: '14px 28px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        background: 'rgba(7, 9, 14, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Brand */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => handleNavClick('dashboard')}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d2ff 0%, #00f2fe 50%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 242, 254, 0.35)'
          }}>
            <Icon name="automessage-logo" size={38} />
          </div>
          <div>
            <div className="brand-font" style={{ fontSize: '19px', color: '#ffffff', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              AutoMessage
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginTop: '3px' }}>
              BULK MESSAGING ENGINE
            </div>
          </div>
        </div>

        {/* Center Nav Pill Links (Desktop) */}
        <div className="desktop-nav-links nav-pill-container">
          <button
            className={`nav-pill-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <Icon name="activity" size={15} color={currentView === 'dashboard' ? '#fff' : '#94a3b8'} />
            Dashboard
          </button>

          <button
            className={`nav-pill-btn ${currentView === 'wizard' ? 'active' : ''}`}
            onClick={() => handleNavClick('wizard')}
          >
            <Icon name="plus" size={15} color={currentView === 'wizard' ? '#fff' : '#94a3b8'} />
            New Campaign
          </button>

          <button
            className={`nav-pill-btn ${currentView === 'templates' ? 'active' : ''}`}
            onClick={() => handleNavClick('templates')}
          >
            <Icon name="layers" size={15} color={currentView === 'templates' ? '#fff' : '#94a3b8'} />
            Templates
          </button>

          <button
            className={`nav-pill-btn ${currentView === 'integrations' ? 'active' : ''}`}
            onClick={() => handleNavClick('integrations')}
          >
            <Icon name="settings" size={15} color={currentView === 'integrations' ? '#fff' : '#94a3b8'} />
            Channels
          </button>
        </div>

        {/* Right Status Badges (Desktop) */}
        <div className="desktop-badges" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* WhatsApp Ready */}
          <div 
            onClick={() => handleNavClick('integrations')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#34d399',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon name="whatsapp" size={14} color="#10b981" />
            <span>WhatsApp Ready</span>
            <span 
              className="pulse-dot-green"
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} 
            />
          </div>

          {/* Gmail */}
          <div 
            onClick={() => handleNavClick('integrations')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon name="mail" size={14} color="#ef4444" />
            <span>Gmail</span>
            <span 
              className="pulse-dot-red"
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} 
            />
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <Icon name={mobileMenuOpen ? "x-circle" : "layers"} size={22} />
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

          <button
            className={`btn ${currentView === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleNavClick('templates')}
          >
            <Icon name="layers" size={16} />
            Templates
          </button>

          <button
            className={`btn ${currentView === 'integrations' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleNavClick('integrations')}
          >
            <Icon name="settings" size={16} />
            Channels
          </button>
        </div>
      )}
    </>
  );
};
