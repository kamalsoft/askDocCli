import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Resource Center page to view technical and business guides.
 */
const Resources = () => {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    if (content && !loading) {
      mermaid.contentLoaded();
    }
  }, [content, loading]);

  const guides = [
    { id: 'technicalFeatures.md', title: 'Technical Features', desc: 'Deep dive into Hybrid Search, Agentic Loops, and Performance.' },
    { id: 'modelConfiguration.md', title: 'Model Configuration', desc: 'Detailed setup guides for ONNX and OpenRouter.' },
    { id: 'businessOverview.md', title: 'Business Overview', desc: 'ROI, DPIA, and Industry use cases.' }
  ];

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  const loadGuide = async (id) => {
    setLoading(true);
    setSelectedGuide(id);
    try {
      const res = await fetch(`/api/documentation/get?name=${id}`);
      const text = await res.text();
      setContent(text);
    } catch (e) {
      setContent('Error loading guide.');
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = guides.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', color: '#f8fafc', padding: '0 2rem' }}>
      {!selectedGuide ? (
        <>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '0.5rem' }}>Resource Center</h1>
          <p style={{ color: '#94a3b8', marginBottom: '2.5rem' }}>Deep dives into the technical architecture and business value of DocIntel.</p>
          <input 
            type="text"
            placeholder="Search for a specific guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1e293b', background: '#020617', color: '#f8fafc', marginBottom: '2.5rem', fontSize: '1rem', outline: 'none' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredGuides.map(g => (
              <div 
                key={g.id} 
                onClick={() => loadGuide(g.id)}
                style={{ 
                  padding: '25px', border: '1px solid #1e293b', borderRadius: '16px', cursor: 'pointer',
                  transition: 'all 0.2s', background: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#1e293b'; }}
              >
                <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '1.1rem' }}>{g.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button 
            onClick={() => setSelectedGuide(null)} 
            style={{ marginBottom: '1.5rem', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            <span>←</span> Back
          </button>
          <div 
            ref={contentRef}
            className="markdown-viewer"
            style={{ 
              background: '#0f172a', padding: '3rem', borderRadius: '20px', border: '1px solid #1e293b', 
              color: '#e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', lineHeight: '1.8'
            }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({children}) => <p style={{ color: '#cbd5e1', marginBottom: '1.5rem', fontSize: '1rem' }}>{children}</p>,
                li: ({children}) => <li style={{ color: '#cbd5e1', marginBottom: '0.6rem' }}>{children}</li>,
                strong: ({children}) => <strong style={{ color: '#f8fafc', fontWeight: '700' }}>{children}</strong>,
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '');
                  if (!inline && match && match[1] === 'mermaid') {
                    return <div className="mermaid">{String(children).replace(/\n$/, '')}</div>;
                  }
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#38bdf8' }}>Retrieving Guide...</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Resources;