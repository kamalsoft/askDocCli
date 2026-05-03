import React, { useState, useEffect, useRef } from 'react';

const Ask = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [thought, setThought] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [retryTimer, setRetryTimer] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const scrollContainerRef = useRef(null);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ask_history') || '[]');
    } catch (e) { return []; }
  });
  const answerEndRef = useRef(null);

  // Auto-scroll to the latest output
  useEffect(() => {
    if (loading) {
      answerEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [answer, thought, status]);

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem('ask_history', JSON.stringify(history));
  }, [history]);

  // Handle exponential backoff countdown
  useEffect(() => {
    if (retryTimer > 0) {
      const timer = setInterval(() => {
        setRetryTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [retryTimer]);

  const processSSE = (line, q) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || !trimmedLine.startsWith('data: ')) return;

    try {
      const data = JSON.parse(trimmedLine.replace('data: ', ''));

      if (data.type === 'thought') setThought(t => t + data.text);
      if (data.type === 'answer') setAnswer(a => a + (data.text || ''));
      if (data.type === 'status') setStatus(data.text);
      if (data.type === 'answer_start') setStatus('Synthesizing answer...');
      if (data.type === 'error') {
        setError(data.message);
        setStatus('Error');
        handleBackoff(data.message);
        setLoading(false);
      }

      if (data.done) {
        setStatus('Complete');
        if (data.citations) setCitations(data.citations);
        if (data.answer) setAnswer(data.answer); // Sync final grounded answer
        setRetryCount(0); // Reset count on success
        const finalStats = {
          tps: data.tps,
          tokenCount: data.tokenCount,
          hasMoreContext: data.hasMoreContext
        };
        setStats(finalStats);

        // Save to history
        setHistory(prev => {
          const newItem = {
            id: Date.now(),
            question: q,
            answer: data.answer || '',
            citations: data.citations || [],
            stats: finalStats,
            timestamp: new Date().toLocaleString()
          };
          return [newItem, ...prev.filter(h => h.question !== q)].slice(0, 20);
        });
      }
    } catch (e) {
      console.error("SSE Parsing Error:", e);
    }
  };

  const handleBackoff = (message) => {
    if (message.toLowerCase().includes('rate limit')) {
      const delay = Math.pow(2, retryCount) * 5; // 5s, 10s, 20s...
      setRetryTimer(delay);
      setRetryCount(prev => prev + 1);
    }
  };

  const loadFromHistory = (item) => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setThought(''); // Thoughts are ephemeral and not reloaded
    setCitations(item.citations);
    setStats(item.stats || null);
    setError('');
    setStatus('Reloaded from history');
  };

  const copyToClipboard = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const startNewChat = () => {
    setQuestion('');
    setAnswer('');
    setThought('');
    setCitations([]);
    setStats(null);
    setError('');
    setStatus('');
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAsk = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = question.trim();
    if (!q) return;

    // Refer from history if question is repeated
    const existingEntry = history.find(h => h.question.trim().toLowerCase() === q.toLowerCase());
    if (existingEntry) {
      loadFromHistory(existingEntry);
      setStatus('Loaded from history (cached)');
      return;
    }
    
    setLoading(true);
    setAnswer('');
    setThought('');
    setStatus('Connecting to engine...');
    setCitations([]);
    setStats(null);
    setRetryTimer(0);
    setError('');

    const apiBase = import.meta.env.VITE_API_BASE || '';
    try {
      const response = await fetch(`${apiBase}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          processSSE(line, question);
        }
      }
      
      // Handle potential trailing data in buffer
      if (buffer) processSSE(buffer, question);

    } catch (err) {
      setError(err.message);
      handleBackoff(err.message);
      setStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0', maxWidth: '1600px', margin: '0 auto', height: 'calc(100vh - 120px)', color: '#f8fafc' }}>
      {/* History Sidebar */}
      <aside style={{ width: '320px', flexShrink: 0, borderRight: '1px solid #1e293b', padding: '2rem 1.5rem', background: '#0f172a', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>History</h3>
          <button 
            onClick={startNewChat}
            style={{ 
              padding: '4px 12px', 
              cursor: 'pointer', 
              background: 'transparent', 
              border: '1px solid #334155', 
              color: '#94a3b8', 
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}
          >
            New Chat
          </button>
        </div>
        <input 
          style={{ width: '100%', padding: '12px', marginBottom: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b', background: '#020617', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
          placeholder="Search history..."
          value={historySearch}
          onChange={e => setHistorySearch(e.target.value)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {history.length === 0 && <p style={{ color: '#475569', fontSize: '0.85rem' }}>Empty workspace</p>}
          {history
            .filter(item => item.question.toLowerCase().includes(historySearch.toLowerCase()))
            .map(item => (
            <div 
              key={item.id} 
              onClick={() => loadFromHistory(item)}
              style={{ 
                padding: '12px', 
                borderRadius: '10px', 
                border: '1px solid #1e293b', 
                cursor: 'pointer',
                background: question === item.question ? '#0ea5e920' : '#1e293b40',
                fontSize: '0.85rem',
                transition: 'all 0.2s',
                position: 'relative',
                paddingRight: '30px'
              }}
            >
              <div style={{ fontWeight: '600', color: question === item.question ? '#38bdf8' : '#cbd5e1', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.question}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.timestamp}</div>
              <button
                onClick={(e) => deleteHistoryItem(e, item.id)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  lineHeight: '1'
                }}
                title="Delete from history"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <button 
            onClick={() => { if(confirm('Clear history?')) setHistory([]); }}
            style={{ marginTop: '20px', background: 'none', border: 'none', color: '#999', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear history
          </button>
        )}
      </aside>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#020617' }}>
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '12px', padding: '2rem 2.5rem', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
          <input 
            style={{ flex: 1, padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155', background: '#020617', color: '#f8fafc', fontSize: '1rem', outline: 'none' }} 
            value={question} 
            onChange={e => setQuestion(e.target.value)} 
            placeholder="Enter a technical query..." 
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '0 24px', 
              cursor: 'pointer', 
              background: '#38bdf8', 
              border: 'none', 
              borderRadius: '12px',
              fontWeight: '700',
              color: '#0f172a'
            }}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>

        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', position: 'relative' }}>
          
          {answer && (
            <button 
              onClick={scrollToTop}
              style={{
                position: 'fixed',
                bottom: '80px',
                right: '40px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
              }}
              title="Scroll to Top"
            >
              ↑
            </button>
          )}

        {error && (
          <div style={{ 
            padding: '1rem', 
            background: '#ffebee', 
            color: '#c62828', 
            border: '1px solid #ef9a9a', 
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.95rem'
          }}>
            <strong>❌ Ask failed:</strong> {error}
            <button 
              onClick={() => retryTimer === 0 && handleAsk()}
              disabled={retryTimer > 0}
              style={{ 
                marginLeft: '15px', 
                padding: '4px 10px', 
                cursor: retryTimer > 0 ? 'not-allowed' : 'pointer', 
                background: retryTimer > 0 ? '#9e9e9e' : '#c62828', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}
            >
              {retryTimer > 0 ? `Retry in ${retryTimer}s` : 'Retry'}
            </button>
          </div>
        )}

        {status && (
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem', fontStyle: 'italic' }}>
            ⚡ {status}
          </div>
        )}

        {thought && (
          <div style={{ background: '#1e293b40', padding: '20px', marginTop: '10px', borderLeft: '2px solid #38bdf8', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
            <small style={{ display: 'block', fontWeight: '700', color: '#38bdf8', marginBottom: '8px', fontSize: '0.7rem', textTransform: 'uppercase' }}>Thought Logs</small>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>{thought}</div>
          </div>
        )}

        {answer && (
          <div className="answer-panel" style={{ 
            position: 'relative',
            border: '1px solid #1e293b', 
            padding: '30px', 
            marginTop: '20px', 
            whiteSpace: 'pre-wrap', 
            borderRadius: '16px', 
            background: '#0f172a',
            lineHeight: '1.7',
            fontSize: '1.05rem',
            color: '#e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <button 
              onClick={copyToClipboard}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '4px 8px',
                fontSize: '0.65rem',
                cursor: 'pointer',
                background: copied ? '#22c55e' : '#1e293b',
                color: copied ? '#fff' : '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {answer}
          </div>
        )}

        {citations.length > 0 && (
          <div style={{ marginTop: '24px', padding: '1.5rem', background: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Citations</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              {citations.map((c, i) => <li key={i} style={{ marginBottom: '4px' }}>{c}</li>)}
            </ul>
          </div>
        )}
        <div ref={answerEndRef} />

        {stats && (
          <div style={{ marginTop: '2rem', fontSize: '0.7rem', color: '#475569', textAlign: 'right', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
            {stats.tps} tokens/sec • {stats.tokenCount} tokens
            {stats.hasMoreContext && <div style={{ color: '#38bdf8', marginTop: '0.5rem' }}>ℹ Further documentation relevant to this query is available. Adjust Top K to retrieve more.</div>}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
export default Ask;