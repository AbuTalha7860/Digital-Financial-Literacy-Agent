import React from 'react';

const Navigation = ({ 
  username, 
  currentView, 
  onViewChange, 
  onLogout,
  sidebarOpen,
  onSidebarToggle
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'quiz', label: 'Quiz', icon: '📝' },
    { id: 'progress', label: 'My Progress', icon: '📊' },
    { id: 'chat', label: 'Chat', icon: '🤖' }
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 998
          }}
          onClick={onSidebarToggle}
        />
      )}

      {/* Mobile sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: sidebarOpen ? 0 : '-280px',
        width: '280px',
        height: '100vh',
        backgroundColor: '#ffffff',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        zIndex: 999,
        transition: 'left 0.3s ease',
        padding: '1rem'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: '600' }}>
            💰 Digital Financial Literacy
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Welcome, {username}!
          </p>
        </div>
        
        <nav>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                onSidebarToggle();
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                backgroundColor: currentView === item.id ? '#3b82f6' : 'transparent',
                color: currentView === item.id ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (currentView !== item.id) {
                  e.target.style.backgroundColor = '#f1f5f9';
                }
              }}
              onMouseOut={(e) => {
                if (currentView !== item.id) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            marginTop: '2rem',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            backgroundColor: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#ef4444';
            e.target.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#ef4444';
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Desktop navigation */}
      <nav style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Logo and mobile menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="mobile-menu-btn"
              onClick={onSidebarToggle}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              ☰
            </button>
            
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1e293b',
              margin: 0
            }}>
              💰 Digital Financial Literacy
            </h1>
          </div>

          {/* Desktop nav items */}
          <div className="desktop-nav" style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  backgroundColor: currentView === item.id ? '#3b82f6' : 'transparent',
                  color: currentView === item.id ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (currentView !== item.id) {
                    e.target.style.backgroundColor = '#f1f5f9';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentView !== item.id) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
            
            <div style={{ marginLeft: '1rem', color: '#1e293b', fontSize: '0.95rem', fontWeight: '600' }}>
              {username ? `Welcome, ${username}` : ''}
            </div>
            
            <button
              onClick={onLogout}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ef4444',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#ef4444';
                e.target.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#ef4444';
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation; 