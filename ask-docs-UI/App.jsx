import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Ask from './pages/Ask';
import Docs from './pages/Docs';
import Settings from './pages/Settings';
import Resources from './pages/Resources';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ padding: '1rem 2.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '2.5rem', background: '#0f172a', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
            <Link to="/" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', textDecoration: 'none' }}>A</Link>
            <Link to="/" style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.025em', color: '#f8fafc', textDecoration: 'none' }}>
              ask<span style={{ color: '#38bdf8' }}>Docs</span>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link to="/ask" style={{ fontWeight: '600', textDecoration: 'none', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assistant</Link>
            <Link to="/docs" style={{ fontWeight: '600', textDecoration: 'none', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explorer</Link>
            <Link to="/resources" style={{ fontWeight: '600', textDecoration: 'none', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</Link>
            <Link to="/settings" style={{ fontWeight: '600', textDecoration: 'none', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Config</Link>
          </div>
        </nav>
        
        <main style={{ padding: '2rem', flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/resources" element={<Resources />} />
          </Routes>
        </main>

        <footer style={{ padding: '1.2rem 2.5rem', borderTop: '1px solid #1e293b', background: '#0f172a', color: '#64748b', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>© 2026 askDocs AI • Local Intelligence Engine</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div> Engine Online</span>
            <span>v1.2.0-stable</span>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;