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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {!selectedGuide ? (
        <>
          <h1 style={{ color: '#2d3436' }}>📚 Resource Center</h1>
          <p style={{ color: '#636e72', marginBottom: '2rem' }}>Learn more about the technical architecture and business value of Ask-Docs.</p>
          <input 
            type="text"
            placeholder="Search for a specific guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #dfe6e9', marginBottom: '2rem', fontSize: '1rem', outline: 'none' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredGuides.map(g => (
              <div 
                key={g.id} 
                onClick={() => loadGuide(g.id)}
                style={{ 
                  padding: '25px', border: '1px solid #dfe6e9', borderRadius: '12px', cursor: 'pointer',
                  transition: 'all 0.2s', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#1e88e5'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#dfe6e9'; }}
              >
                <h3 style={{ margin: '0 0 12px 0', color: '#1e88e5' }}>{g.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#636e72', margin: 0, lineHeight: '1.5' }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button 
            onClick={() => setSelectedGuide(null)} 
            style={{ marginBottom: '1.5rem', background: 'none', border: 'none', color: '#1e88e5', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <span>←</span> Back to Resources
          </button>
          <div 
            ref={contentRef}
            className="markdown-viewer"
            style={{ 
              background: '#fff', padding: '40px', borderRadius: '12px', border: '1px solid #eee', 
              color: '#2d3436', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' 
            }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
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
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#1e88e5' }}>Retrieving Guide...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Resources;