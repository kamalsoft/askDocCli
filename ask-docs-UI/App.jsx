import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Ask from './pages/Ask';
import Docs from './pages/Docs';
import Settings from './pages/Settings';
import Resources from './pages/Resources';

function App() {
  return (
    <Router>
      <div className="app-layout" style={{ fontFamily: 'sans-serif' }}>
        <nav style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', gap: '2rem', background: '#f9f9f9' }}>
          <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1e88e5' }}>🧠 Ask AI</Link>
          <Link to="/docs" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1e88e5' }}>📂 Explorer</Link>
          <Link to="/settings" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1e88e5' }}>⚙️ Settings</Link>
          <Link to="/resources" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1e88e5' }}>📚 Resources</Link>
        </nav>
        
        <main style={{ padding: '2rem' }}>
          <Routes>
            <Route path="/" element={<Ask />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/resources" element={<Resources />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;