import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const features = [
    { title: 'Privacy First', desc: 'Embeddings and indexing are strictly local. Your data never leaves your infrastructure.', icon: '🔒' },
    { title: 'Hybrid Search', desc: 'Combines semantic vector similarity with BM25 keyword boosting for technical accuracy.', icon: '🔍' },
    { title: 'Agentic Reasoning', desc: 'AI that understands when to search deeper to find the missing links in your docs.', icon: '🤖' },
    { title: 'Offline Capable', desc: 'Designed for air-gapped environments. Zero external dependencies required for reasoning.', icon: '🌐' }
  ];

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '4rem auto', textAlign: 'center' }}>
      <header style={{ marginBottom: '5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '15px', marginBottom: '2rem', padding: '10px 20px', background: '#1e293b', borderRadius: '30px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>v1.2.0 Stable Release</span>
        </div>
        <h1 style={{ fontSize: '4rem', fontWeight: '900', letterSpacing: '-0.05em', marginBottom: '1.5rem', background: 'linear-gradient(to bottom right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Documentation Intelligence <br /> Running Locally.
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: '1.6' }}>
          The ultimate local RAG hub. Ingest your Markdown, interact with your internal knowledge base, and build better systems without sacrificing data sovereignty.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <Link to="/ask" style={{ padding: '16px 32px', background: '#38bdf8', color: '#0f172a', textDecoration: 'none', borderRadius: '12px', fontWeight: '800', transition: 'transform 0.2s' }}>Open Assistant</Link>
          <Link to="/docs" style={{ padding: '16px 32px', background: '#1e293b', color: '#f8fafc', textDecoration: 'none', borderRadius: '12px', fontWeight: '700', border: '1px solid #334155' }}>Browse Explorer</Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
        {features.map((f, i) => (
          <div key={i} style={{ padding: '2.5rem', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', textAlign: 'left', transition: 'border-color 0.3s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#f8fafc' }}>{f.title}</h3>
            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '6rem', padding: '4rem', background: 'linear-gradient(to bottom right, #0ea5e910, transparent)', borderRadius: '32px', border: '1px solid #0ea5e920', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '50px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1.5rem' }}>Ready to optimize your workflow?</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Get started by pointing <strong>askDocs</strong> to your technical documentation folder. The engine will handle the heavy lifting of indexing and reasoning entirely on your CPU.
          </p>
          <Link to="/settings" style={{ color: '#38bdf8', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', transition: 'gap 0.2s' }} onMouseEnter={e => e.currentTarget.style.gap = '15px'} onMouseLeave={e => e.currentTarget.style.gap = '10px'}>
            Configure Storage Path <span>→</span>
          </Link>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
           <div style={{ width: '100%', height: '200px', background: '#020617', borderRadius: '20px', border: '1px solid #1e293b', padding: '20px', fontFamily: 'JetBrains Mono' }}>
              <div style={{ color: '#22c55e' }}>$ ask-docs ingest --watch</div>
              <div style={{ color: '#94a3b8', marginTop: '10px' }}>📘 Ingesting docs from: ../docs</div>
              <div style={{ color: '#94a3b8' }}>✅ Model integrity verified.</div>
              <div style={{ color: '#38bdf8' }}>♻️ Change detected: index.md</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Home;