import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Docs = () => {
  const [files, setFiles] = useState([]);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toc, setToc] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    fetch('/api/docs/list').then(res => res.json()).then(data => {
      setFiles(Array.isArray(data) ? data : []);
    });
    
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (content) {
      const headings = [];
      content.split('\n').forEach(line => {
        const match = line.match(/^(#+)\s+(.*)$/);
        if (match) {
          const text = match[2].trim();
          headings.push({
            level: match[1].length,
            text,
            id: slugify(text)
          });
        }
      });
      setToc(headings);
      
      // Trigger mermaid rendering after content update
      const timer = setTimeout(() => mermaid.contentLoaded(), 150);
      return () => clearTimeout(timer);
    }
  }, [content]);

  const slugify = (text) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const copyHeadingLink = (id) => {
    const url = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(selectedDoc)}#${id}`;
    navigator.clipboard.writeText(url);
  };

  const handleEdit = () => {
    if (!selectedDoc) return;
    fetch('/api/docs/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedDoc })
    });
  };

  const loadFile = (name) => {
    setLoading(true);
    setSelectedDoc(name);
    fetch(`/api/docs/get?name=${encodeURIComponent(name)}`)
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);
      });
  };

  const filteredFiles = files.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: '30px', height: 'calc(100vh - 150px)' }}>
      {/* File Explorer Sidebar */}
      <aside style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #eee', paddingRight: '20px', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📁</span> Explorer
        </h3>
        <input 
          type="text" 
          placeholder="Search files..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '0.9rem' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredFiles.map(f => (
            <div 
              key={f} 
              onClick={() => loadFile(f)} 
              style={{ 
                cursor: 'pointer', 
                padding: '10px 12px', 
                borderRadius: '8px',
                background: selectedDoc === f ? '#e3f2fd' : 'transparent',
                color: selectedDoc === f ? '#1e88e5' : '#444',
                fontWeight: selectedDoc === f ? '600' : 'normal',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              📄 {f}
            </div>
          ))}
          {filteredFiles.length === 0 && <p style={{ color: '#999', fontSize: '0.8rem', textAlign: 'center' }}>No matches found.</p>}
        </div>
      </aside>

      {/* Main Content Viewer */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '0 10px', background: '#fff' }}>
        {selectedDoc ? (
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#1e88e5' }}>Retrieving Document...</div>
            ) : (
              <div ref={contentRef} className="markdown-viewer" style={{ paddingBottom: '100px', position: 'relative' }}>
                <button 
                  onClick={handleEdit}
                  style={{ position: 'absolute', right: 0, top: '-45px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}
                  title="Open in local editor"
                >
                  ✎ Edit Page
                </button>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({children}) => {
                      const id = slugify(String(children));
                      return (
                        <h1 id={id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.lastChild.style.opacity = 0.5} onMouseLeave={e => e.currentTarget.lastChild.style.opacity = 0}>
                          {children}
                          <span onClick={() => copyHeadingLink(id)} style={{ cursor: 'pointer', fontSize: '1rem', opacity: 0, color: '#1e88e5', transition: 'opacity 0.2s' }} title="Copy anchor link">🔗</span>
                        </h1>
                      );
                    },
                    h2: ({children}) => {
                      const id = slugify(String(children));
                      return (
                        <h2 id={id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.lastChild.style.opacity = 0.5} onMouseLeave={e => e.currentTarget.lastChild.style.opacity = 0}>
                          {children}
                          <span onClick={() => copyHeadingLink(id)} style={{ cursor: 'pointer', fontSize: '0.9rem', opacity: 0, color: '#1e88e5', transition: 'opacity 0.2s' }} title="Copy anchor link">🔗</span>
                        </h2>
                      );
                    },
                    h3: ({children}) => {
                      const id = slugify(String(children));
                      return (
                        <h3 id={id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.lastChild.style.opacity = 0.5} onMouseLeave={e => e.currentTarget.lastChild.style.opacity = 0}>
                          {children}
                          <span onClick={() => copyHeadingLink(id)} style={{ cursor: 'pointer', fontSize: '0.8rem', opacity: 0, color: '#1e88e5', transition: 'opacity 0.2s' }} title="Copy anchor link">🔗</span>
                        </h3>
                      );
                    },
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match && match[1] === 'mermaid') {
                        return <div className="mermaid">{String(children).replace(/\n$/, '')}</div>;
                      }
                      return !inline && match ? (
                        <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>{children}</code>
                      );
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b2bec3', gap: '15px' }}>
            <span style={{ fontSize: '3rem' }}>📑</span>
            <p>Select a document from the explorer to start reading.</p>
          </div>
        )}
      </main>

      {/* Table of Contents Sidebar */}
      <aside style={{ width: '220px', flexShrink: 0, borderLeft: '1px solid #eee', paddingLeft: '20px', overflowY: 'auto' }}>
        <h4 style={{ marginTop: 0, color: '#636e72', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>On this page</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {toc.length === 0 && <p style={{ fontSize: '0.8rem', color: '#999' }}>No sections found.</p>}
          {toc.map((item, i) => (
            <a 
              key={i} 
              href={`#${item.id}`}
              style={{ 
                textDecoration: 'none', 
                color: '#1e88e5', 
                fontSize: '0.85rem',
                paddingLeft: `${(item.level - 1) * 12}px`,
                opacity: 0.8,
                lineHeight: '1.4'
              }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {item.text}
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
};
export default Docs;