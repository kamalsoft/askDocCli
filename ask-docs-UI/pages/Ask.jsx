import React, { useState, useEffect, useRef } from 'react';

const Ask = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [thought, setThought] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState([]);
  const [stats, setStats] = useState(null);
  const answerEndRef = useRef(null);

  // Auto-scroll to the latest output
  useEffect(() => {
    answerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, thought, status]);

  const processSSE = (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || !trimmedLine.startsWith('data: ')) return;

    try {
      const data = JSON.parse(trimmedLine.replace('data: ', ''));

      if (data.type === 'thought') setThought(t => t + data.text);
      if (data.type === 'answer') setAnswer(a => a + (data.text || ''));
      if (data.type === 'status') setStatus(data.text);
      if (data.type === 'answer_start') setStatus('Synthesizing answer...');

      if (data.done) {
        setStatus('Complete');
        if (data.citations) setCitations(data.citations);
        if (data.answer) setAnswer(data.answer); // Sync final grounded answer
        setStats({
          tps: data.tps,
          tokenCount: data.tokenCount,
          hasMoreContext: data.hasMoreContext
        });
      }
    } catch (e) {
      console.error("SSE Parsing Error:", e);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setLoading(true);
    setAnswer('');
    setThought('');
    setStatus('Connecting to engine...');
    setCitations([]);
    setStats(null);

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ question })
      });

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
          processSSE(line);
        }
      }
      
      // Handle potential trailing data in buffer
      if (buffer) processSSE(buffer);

    } catch (err) {
      setStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '50px' }}>
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
          border: '1px solid #e3f2fd', 
          padding: '20px', 
          marginTop: '15px', 
          whiteSpace: 'pre-wrap', 
          borderRadius: '8px', 
          background: 'white',
          lineHeight: '1.6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
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
  );
};
export default Ask;