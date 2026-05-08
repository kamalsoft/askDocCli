import React from 'react';

const Layout = React.forwardRef(({ leftSidebar, children, rightSidebar, showScrollTop, scrollToTop }, ref) => {
  return (
    <div style={{ display: 'flex', gap: '0', maxWidth: '1600px', margin: '0 auto', height: 'calc(100vh - 120px)', color: '#f8fafc' }}>
      {leftSidebar && (
        <aside style={{ width: '300px', flexShrink: 0, borderRight: '1px solid #1e293b', padding: '2rem 1.5rem', background: '#0f172a', overflowY: 'auto' }}>
          {leftSidebar}
        </aside>
      )}

      <main ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem', background: '#020617', position: 'relative' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          {children}
        </div>
        
        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            style={{
              position: 'fixed',
              bottom: '30px',
              right: rightSidebar ? '290px' : '40px',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              cursor: 'pointer',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            ↑
          </button>
        )}
      </main>

      {rightSidebar && (
        <aside style={{ width: '260px', flexShrink: 0, borderLeft: '1px solid #1e293b', padding: '2rem 1.5rem', background: '#0f172a', overflowY: 'auto' }}>
          {rightSidebar}
        </aside>
      )}
    </div>
  );
});

export default Layout;