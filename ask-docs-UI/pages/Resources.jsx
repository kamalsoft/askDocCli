import React, { useState, useEffect, useMemo, useRef } from 'react';
import MarkdownViewer from './MarkdownViewer';
import useActiveHeadingObserver from './useActiveHeadingObserver';
import GithubSlugger from 'github-slugger';
import Layout from './Layout';

/**
 * Resource Center page to view technical and business guides.
 */
const Resources = () => {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All'); // New state for category filter
  const [guides, setGuides] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef(null);
  const mainRef = useRef(null);
  const [error, setError] = useState(null);

  // 0. Dynamically fetch the list of guides from the server
  useEffect(() => {
    // Fetch the base list; filtering documentation subfolders on the query string 
    // often causes 404 fallbacks on simple dev servers.
    fetch('/api/docs/list')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Expected JSON, received:', text.substring(0, 100));
          throw new Error('Server returned an invalid format (likely an HTML error page).');
        }
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) return;
        
        // Handle both object and string array formats for robustness.
        // If the backend returns strings, we convert them to the expected Guide object.
        const mappedGuides = data.map(item => {
          if (typeof item === 'string') {
            return { id: item, title: item.split('/').pop().replace('.md', ''), category: 'Technical', description: 'Internal technical resource.' };
          }
          return item;
        }).filter(g => g.id.includes('documentation/'));

        setGuides(mappedGuides);
      })
      .catch(err => console.error('Failed to load guides list', err));
  }, []);

  useEffect(() => {
    const fetchGuide = async () => {
      if (!selectedGuide) return;
      setLoading(true);
      try {
        console.log(`Fetching guide content: ${selectedGuide}`);
        const res = await fetch(`/api/docs/get?name=${encodeURIComponent(selectedGuide)}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Guide not found' : 'Failed to load guide');
        const text = await res.text();
        setContent(text);
        setError(null);
      } catch (e) {
        console.error(`Error loading guide: ${selectedGuide}`, e);
        setContent('');
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGuide();
  }, [selectedGuide]);

  // 2. Extract headings for the TOC (Memoized to prevent hook churn)
  const headings = useMemo(() => {
    if (!content) return [];
    const slugger = new GithubSlugger();
    const found = [];
    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const text = match[2].trim();
      found.push({
        id: slugger.slug(text),
        text,
        level: match[1].length,
      });
    }
    return found;
  }, [content]);

  // 3. Observe active heading for TOC highlighting
  const activeId = useActiveHeadingObserver(mainRef, headings);

  const copyHeadingLink = (id) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
  };

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '2rem', color: '#f8fafc' }}>
      <div style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }}>⚠️ Error</div>
      <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
      <button
        onClick={() => setSelectedGuide(null)}
        style={{ padding: '10px 20px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}
      >
        Back to Guides
      </button>
    </div>
  );

  const filteredGuides = guides.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          g.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }
  );

  const ExplorerSidebar = (
    <>
      <h3 style={{ marginTop: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
        Guides
      </h3>
      <input
        type="text"
        placeholder="Search guides..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', marginBottom: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b', background: '#020617', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
      />
      {/* Category Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {['All', 'Technical', 'Business', 'Other'].map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`
              px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200
              ${selectedCategory === category
                ? 'bg-sky-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filteredGuides.map(g => (
          <div
            key={g.id}
            onClick={() => setSelectedGuide(g.id)}
            style={{
              cursor: 'pointer',
              padding: '10px 12px',
              borderRadius: '8px',
              background: selectedGuide === g.id ? '#38bdf815' : 'transparent',
              color: selectedGuide === g.id ? '#38bdf8' : '#94a3b8',
              fontWeight: selectedGuide === g.id ? '600' : 'normal',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
              border: '1px solid transparent'
            }}
            onMouseOver={e => { if (selectedGuide !== g.id) e.currentTarget.style.background = '#1e293b'; }}
            onMouseOut={e => { if (selectedGuide !== g.id) e.currentTarget.style.background = 'transparent'; }}
          >
            {g.title}
          </div>
        ))}
        {filteredGuides.length === 0 && <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>No matches found.</p>}
      </div>
    </>
  );

  const TocSidebar = (
    <>
      <h4 style={{ marginTop: 0, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>On this page</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
        {headings.length === 0 && <p style={{ fontSize: '0.8rem', color: '#999' }}>No sections found.</p>}
        {headings.map((item, i) => (
          <a
            key={i}
            href={`#${item.id}`}
            style={{
              textDecoration: 'none',
              color: activeId === item.id ? '#38bdf8' : '#94a3b8',
              fontSize: '0.85rem',
              paddingLeft: `${(item.level - 1) * 12 + (activeId === item.id ? 10 : 12)}px`,
              transition: 'all 0.2s',
              lineHeight: '1.4',
              opacity: activeId === item.id ? 1 : 0.8,
              fontWeight: activeId === item.id ? '600' : 'normal',
              borderLeft: activeId === item.id ? '2px solid #38bdf8' : '2px solid transparent'
            }}
            onMouseOver={e => { if (activeId !== item.id) { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.opacity = '1'; } }}
            onMouseOut={e => { if (activeId !== item.id) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.opacity = '0.8'; } }}
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
  );

  return (
    <Layout
      ref={mainRef}
      leftSidebar={ExplorerSidebar}
      rightSidebar={selectedGuide ? TocSidebar : null}
    >
      {loading ? (
        <div className="fade-in" style={{
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '100px 20px',
          color: '#38bdf8' 
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: '800', 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase',
            marginBottom: '24px',
            opacity: 0.6
          }}>
            Accessing Knowledge Vault
          </div>
          {/* Skeleton Screen Start */}
          <div style={{
            width: '100%',
            maxWidth: '850px',
            background: '#0f172a',
            padding: '3rem',
            borderRadius: '20px',
            border: '1px solid #1e293b',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            animation: 'pulse 1.5s infinite ease-in-out' // Add a CSS animation for pulse effect
          }}>
            <div style={{ height: '30px', width: '70%', background: '#1e293b', borderRadius: '4px', marginBottom: '20px' }}></div>
            <div style={{ height: '20px', width: '90%', background: '#1e293b', borderRadius: '4px', marginBottom: '10px' }}></div>
            <div style={{ height: '20px', width: '80%', background: '#1e293b', borderRadius: '4px', marginBottom: '10px' }}></div>
            <div style={{ height: '20px', width: '95%', background: '#1e293b', borderRadius: '4px', marginBottom: '30px' }}></div>
            <div style={{ height: '150px', width: '100%', background: '#1e293b', borderRadius: '8px', marginBottom: '20px' }}></div>
            <div style={{ height: '20px', width: '75%', background: '#1e293b', borderRadius: '4px', marginBottom: '10px' }}></div>
            <div style={{ height: '20px', width: '85%', background: '#1e293b', borderRadius: '4px', marginBottom: '10px' }}></div>
          </div>
          {/* Skeleton Screen End */}
        </div>
      ) : !selectedGuide ? (
        <div className="fade-in">
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: '#f8fafc' }}>Knowledge Base</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '3rem' }}>
            Explore technical documentation, configuration guides, and business insights.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredGuides.map(g => (
              <div 
                key={g.id} 
                onClick={() => setSelectedGuide(g.id)}
                style={{ 
                  padding: '2rem', border: '1px solid #1e293b', borderRadius: '16px', cursor: 'pointer',
                  transition: 'all 0.2s', background: '#0f172a'
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1.1rem' }}>{g.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{g.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={contentRef}
          className="markdown-viewer"
          style={{
            background: '#0f172a', padding: '3rem', borderRadius: '20px', border: '1px solid #1e293b',
            color: '#e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', lineHeight: '1.8'
          }}
        >
          <button
            onClick={() => setSelectedGuide(null)}
            style={{ marginBottom: '1.5rem', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            <span>←</span> Back to Guides
          </button>
          <MarkdownViewer content={content} onHeadingClick={copyHeadingLink} />
        </div>
      )}
    </Layout>
  );
};

export default Resources;