import React, { useState, useEffect, useRef, useMemo } from 'react';
import MarkdownViewer from './MarkdownViewer';
import useActiveHeadingObserver from './useActiveHeadingObserver';
import GithubSlugger from 'github-slugger';
import Layout from './Layout';

const Docs = () => {
  const [files, setFiles] = useState([]);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef(null);
  const mainRef = useRef(null);

  // 1. Memoized Heading Extraction (Zero-Waste)
  const toc = useMemo(() => {
    if (!content) return [];
    const slugger = new GithubSlugger();
    const headings = [];
    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const text = match[2].trim();
      headings.push({
        level: match[1].length,
        text,
        id: slugger.slug(text)
      });
    }
    return headings;
  }, [content]);

  // 2. Use Optimized Hook instead of manual useEffect observer
  const activeId = useActiveHeadingObserver(mainRef, toc);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setShowScrollTop(mainRef.current.scrollTop > 300);
      }
    };
    const mainEl = mainRef.current;
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetch('/api/docs/list').then(res => res.json()).then(data => {
      setFiles(Array.isArray(data) ? data : []);
    }).catch(err => console.error("Failed to fetch docs list", err));
  }, []); // Only fetch once on mount

  const copyHeadingLink = (id) => {
    const url = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(selectedDoc)}#${id}`;
    navigator.clipboard.writeText(url);
  };

  const handleEdit = () => {
    if (!selectedDoc) return;
    setIsEditing(true);
    fetch('/api/docs/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedDoc })
    }).finally(() => {
      // Brief delay to show active state
      setTimeout(() => setIsEditing(false), 1000);
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
    <Layout
      ref={mainRef}
      leftSidebar={
        <>
          <h3 style={{ marginTop: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
            Explorer
          </h3>
        <input 
          type="text" 
          placeholder="Search files..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b', background: '#020617', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
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
                background: selectedDoc === f ? '#38bdf815' : 'transparent',
                color: selectedDoc === f ? '#38bdf8' : '#94a3b8',
                fontWeight: selectedDoc === f ? '600' : 'normal',
                fontSize: '0.85rem',
                transition: 'all 0.2s',
                border: '1px solid transparent'
              }}
              onMouseOver={e => { if (selectedDoc !== f) e.currentTarget.style.background = '#1e293b'; }}
              onMouseOut={e => { if (selectedDoc !== f) e.currentTarget.style.background = 'transparent'; }}
            >
              {f}
            </div>
          ))}
          {filteredFiles.length === 0 && <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>No matches found.</p>}
        </div>
        </>
      }
      rightSidebar={
        <>
          <h4 style={{ marginTop: 0, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>On this page</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {toc.length === 0 && <p style={{ fontSize: '0.8rem', color: '#999' }}>No sections found.</p>}
            {toc.map((item, i) => (
              <a
                key={i}
                href={`#${item.id}`}
                style={{
                  textDecoration: 'none',
                  color: activeId === item.id ? '#38bdf8' : '#94a3b8', // Highlight active
                  fontSize: '0.85rem',
                  paddingLeft: `${(item.level - 1) * 12 + (activeId === item.id ? 10 : 12)}px`, // Indent and slight shift for active
                  transition: 'all 0.2s',
                  lineHeight: '1.4',
                  opacity: activeId === item.id ? 1 : 0.8,
                  fontWeight: activeId === item.id ? '600' : 'normal',
                  borderLeft: activeId === item.id ? '2px solid #38bdf8' : '2px solid transparent' // Left border for active
                }}
                onMouseOver={e => {
                  if (activeId !== item.id) { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.opacity = '1'; }
                }}
                onMouseOut={e => {
                  if (activeId !== item.id) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.opacity = '0.8'; }
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
        </>
      }
      showScrollTop={showScrollTop}
      scrollToTop={scrollToTop}
    >
      {selectedDoc ? (
    loading ? (
      <div style={{ textAlign: 'center', padding: '50px', color: '#38bdf8' }}>Retrieving Document...</div>
    ) : (
              <div ref={contentRef} className="markdown-viewer fade-in" style={{ paddingBottom: '100px', position: 'relative', color: '#e2e8f0', lineHeight: '1.8' }}>
                <button 
                  onClick={handleEdit}
                  style={{ position: 'absolute', right: 0, top: '-45px', padding: '6px 14px', borderRadius: '8px', border: isEditing ? '1px solid #38bdf8' : '1px solid #334155', background: '#1e293b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: isEditing ? '#38bdf8' : '#f8fafc', transition: 'all 0.2s' }}
                  title="Open in local editor"
                  onMouseOver={e => e.currentTarget.style.borderColor = '#38bdf8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = isEditing ? '#38bdf8' : '#334155'}
                >
                  {isEditing ? '🚀 Opening Editor...' : '✎ Edit Page'}
                </button>
                <MarkdownViewer content={content} onHeadingClick={copyHeadingLink} />
              </div>
    )) : (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '15px', paddingTop: '100px' }}>
      <span style={{ fontSize: '4rem', opacity: 0.2 }}>📂</span>
      <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#64748b' }}>Select a document from the explorer to start reading.</p>
    </div>
    )}
    </Layout>
  );
};
export default Docs;