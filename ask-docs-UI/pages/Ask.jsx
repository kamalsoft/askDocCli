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
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ask_history') || '[]');
    } catch (e) { return []; }
  });
  const answerEndRef = useRef(null);

  // Auto-scroll to the latest output
  useEffect(() => {
    answerEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    try {
      const response = await fetch('/ask', {
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
    <div style={{ display: 'flex', gap: '30px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* History Sidebar */}
      <aside style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #eee', paddingRight: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>History</h3>
          <button 
            onClick={startNewChat}
            style={{ 
              padding: '5px 10px', 
              cursor: retryTimer > 0 ? 'not-allowed' : 'pointer', 
              background: 'white', 
              border: '1px solid #1e88e5', 
              color: '#1e88e5', 
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}
          >
            New Chat
          </button>
        </div>
        <input 
          style={{ width: '100%', padding: '8px', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', boxSizing: 'border-box' }}
          placeholder="Search history..."
          value={historySearch}
          onChange={e => setHistorySearch(e.target.value)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.length === 0 && <p style={{ color: '#999', fontSize: '0.9rem' }}>No recent questions.</p>}
          {history
            .filter(item => item.question.toLowerCase().includes(historySearch.toLowerCase()))
            .map(item => (
            <div 
              key={item.id} 
              onClick={() => loadFromHistory(item)}
              style={{ 
                padding: '10px', 
                borderRadius: '6px', 
                border: '1px solid #eee', 
                cursor: 'pointer',
                background: question === item.question ? '#e3f2fd' : 'white',
                fontSize: '0.85rem',
                transition: 'all 0.2s',
                position: 'relative',
                paddingRight: '30px'
              }}
            >
              <div style={{ fontWeight: '600', color: '#444', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.question}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{item.timestamp}</div>
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
      <div style={{ flex: 1 }}>
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <input 
            style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }} 
            value={question} 
            onChange={e => setQuestion(e.target.value)} 
            placeholder="Ask your documentation anything..." 
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '0 20px', 
              cursor: 'pointer', 
              background: '#1e88e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>

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
          <div style={{ background: '#f8f9fa', padding: '15px', marginTop: '10px', borderLeft: '4px solid #dee2e6', borderRadius: '4px' }}>
            <small style={{ display: 'block', fontWeight: 'bold', color: '#6c757d', marginBottom: '5px' }}>THOUGHT PROCESS</small>
            <div style={{ color: '#495057', fontSize: '0.95rem' }}>{thought}</div>
          </div>
        )}

        {answer && (
          <div style={{ 
            position: 'relative',
            border: '1px solid #e3f2fd', 
            padding: '20px', 
            marginTop: '15px', 
            whiteSpace: 'pre-wrap', 
            borderRadius: '8px', 
            background: 'white',
            lineHeight: '1.6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <button 
              onClick={copyToClipboard}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '4px 8px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                background: copied ? '#4caf50' : '#f5f5f5',
                color: copied ? 'white' : '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {answer}
          </div>
        )}

        {citations.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#fffde7', border: '1px solid #fff59d', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#f57f17' }}>SOURCES</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#5d4037' }}>
              {citations.map((c, i) => <li key={i} style={{ marginBottom: '4px' }}>{c}</li>)}
            </ul>
          </div>
        )}
        <div ref={answerEndRef} />

        {stats && (
          <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#9e9e9e', textAlign: 'right', borderTop: '1px solid #eee', paddingTop: '10px' }}>
            Speed: <strong>{stats.tps}</strong> tokens/sec | Total: <strong>{stats.tokenCount}</strong> tokens
            {stats.hasMoreContext && <div style={{ color: '#1e88e5', marginTop: '5px' }}>💡 More relevant data was found. Increase topK in settings for a more thorough answer.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
export default Ask;