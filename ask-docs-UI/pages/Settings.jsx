import React, { useState, useEffect } from 'react';

/**
 * Settings page for managing model verification and application configuration.
 */
const Settings = () => {
  const [config, setConfig] = useState(null);
  const [verifyResults, setVerifyResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestOptions, setIngestOptions] = useState({ force: false, debug: false });
  const [ingestProgress, setIngestProgress] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);
  const [message, setMessage] = useState('');
  const [connLoading, setConnLoading] = useState(false);
  const [connResult, setConnResult] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      setMessage('Failed to load configuration.');
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setVerifyResults(null);
    try {
      const res = await fetch('/api/models/verify', { method: 'POST' });
      const data = await res.json();
      setVerifyResults(data);
    } catch (e) {
      setMessage('Verification process failed to start.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConnectivity = async () => {
    setConnLoading(true);
    setConnResult(null);
    try {
      const res = await fetch('/api/models/verify', { method: 'POST' });
      const data = await res.json();
      // Extract just the remote check from the full verification results
      setConnResult(data.remote || { ok: false, message: 'Check failed' });
    } catch (e) {
      setConnResult({ ok: false, message: 'Failed to reach engine' });
    } finally {
      setConnLoading(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestProgress({ current: 'Connecting...', count: 0, total: 0 });
    setMessage('');
    try {
      const response = await fetch('/api/ingest', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestOptions)
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
          processIngestLine(line);
        }
      }
      if (buffer) processIngestLine(buffer);
    } catch (e) {
      setMessage('❌ Failed to communicate with server.');
      setIngestProgress(null);
    } finally {
      setIngesting(false);
    }
  };

  const processIngestLine = (line) => {
    if (!line.startsWith('data: ')) return;
    try {
      const data = JSON.parse(line.replace('data: ', ''));
      if (data.type === 'start') {
        setIngestProgress(p => ({ ...p, total: data.total }));
      } else if (data.type === 'process') {
        setIngestProgress(p => ({ ...p, current: `Processing: ${data.file}`, count: (p.count || 0) + 1 }));
      } else if (data.type === 'skip') {
        setIngestProgress(p => ({ ...p, current: `Skipped (Cached): ${data.file}`, count: (p.count || 0) + 1 }));
      } else if (data.type === 'done') {
        setMessage(`✅ ${data.message}`);
        setIngestProgress(null);
      } else if (data.type === 'error') {
        setMessage(`❌ ${data.message}`);
        setIngestProgress(null);
      }
    } catch (e) { console.error("SSE Error:", e); }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the ingestion cache? This will force a full re-embedding of all documents on the next ingest.')) return;
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage('✅ Ingestion cache cleared.');
      } else {
        setMessage('ℹ️ No cache file found to clear.');
      }
    } catch (e) {
      setMessage('❌ Error clearing cache.');
    }
  };

  const handleBenchmark = async () => {
    setBenchmarking(true);
    setBenchmarkProgress({ results: [], total: 0, passed: 0 });
    setMessage('');
    try {
      const response = await fetch('/api/benchmark', { method: 'POST' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start benchmark');
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
          processBenchmarkLine(line);
        }
      }
      if (buffer) processBenchmarkLine(buffer);
    } catch (e) {
      setMessage(`❌ ${e.message}`);
    } finally {
      setBenchmarking(false);
    }
  };

  const processBenchmarkLine = (line) => {
    if (!line.startsWith('data: ')) return;
    try {
      const data = JSON.parse(line.replace('data: ', ''));
      if (data.type === 'start') {
        setBenchmarkProgress(p => ({ ...p, total: data.total }));
      } else if (data.type === 'result') {
        setBenchmarkProgress(p => ({ 
          ...p, 
          results: [...p.results, data],
          passed: data.success ? p.passed + 1 : p.passed
        }));
      } else if (data.type === 'done') {
        setMessage(`🏁 Benchmark complete: ${data.passed}/${data.total} tests passed.`);
      } else if (data.type === 'error') {
        setMessage(`❌ Benchmark Error: ${data.message}`);
      }
    } catch (e) { console.error("SSE Error:", e); }
  };

  const updateConfig = async (updates) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchConfig();
        setMessage('Configuration updated successfully.');
      }
    } catch (e) {
      setMessage('Failed to update configuration.');
    }
  };

  return (
    <div className="settings-container" style={{ padding: '2rem', maxWidth: '800px' }}>
      <h1>System Settings</h1>
      {message && <div style={{ padding: '1rem', background: '#e3f2fd', marginBottom: '1rem', borderRadius: '4px' }}>{message}</div>}
      
      <section className="config-section" style={{ marginBottom: '2rem' }}>
        <h2>Inference Configuration</h2>
        {config && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Inference Mode</label>
              <select 
                value={config.inferenceMode} 
                onChange={(e) => updateConfig({ inferenceMode: e.target.value })}
                style={{ padding: '0.5rem', width: '200px' }}
              >
                <option value="local">Local (ONNX)</option>
                <option value="openrouter">OpenRouter (Cloud)</option>
                <option value="auto">Auto (Fallback)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Source Context Depth (Top K: {config.topK})
                <small style={{ display: 'block', color: '#666', fontWeight: 'normal', marginTop: '0.2rem' }}>
                  How many document snippets the AI "reads" to answer. Higher values provide more detail but can confuse smaller models.
                </small>
              </label>
              <input 
                type="range" 
                min="1" 
                max="15"
                step="1"
                value={config.topK} 
                onChange={(e) => updateConfig({ topK: parseInt(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Answer Reliability Guard (Threshold: {config.confidenceThreshold})
                <small style={{ display: 'block', color: '#666', fontWeight: 'normal', marginTop: '0.2rem' }}>
                  Controls when to ignore documents and use general AI knowledge. 0.1 is loose; 0.5 is strict (maximum recommended).
                </small>
              </label>
              <input 
                type="range" 
                min="0.01" 
                max="1.0"
                step="0.01"
                value={config.confidenceThreshold} 
                onChange={(e) => updateConfig({ confidenceThreshold: parseFloat(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="bm25"
                checked={config.bm25Only} 
                onChange={(e) => updateConfig({ bm25Only: e.target.checked })}
              />
              <label htmlFor="bm25">BM25-Only Mode (Disable semantic embeddings for speed)</label>
            </div>
          </div>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

      <section className="openrouter-section" style={{ marginBottom: '2rem' }}>
        <h2>OpenRouter Configuration</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Configure cloud-based models when using OpenRouter or Auto modes.</p>
        {config?.openrouter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>AI Model ID</label>
              <input 
                type="text"
                placeholder="e.g. google/gemini-pro"
                value={config.openrouter.model}
                onChange={(e) => updateConfig({ openrouter: { ...config.openrouter, model: e.target.value } })}
                style={{ padding: '0.5rem', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={handleCheckConnectivity}
                disabled={connLoading}
                style={{ 
                  padding: '0.4rem 0.8rem', 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  background: 'white',
                  border: '1px solid #1e88e5',
                  color: '#1e88e5',
                  borderRadius: '4px'
                }}
              >
                {connLoading ? 'Testing...' : 'Check Connectivity'}
              </button>
              {connResult && (
                <span style={{ fontSize: '0.85rem', color: connResult.ok ? '#2e7d32' : '#d32f2f' }}>
                  {connResult.ok ? '✅ Connected' : `❌ ${connResult.message}`}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

      <section className="ingest-section" style={{ marginBottom: '2rem' }}>
        <h2>Document Management</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Trigger a manual scan of your <code>docs/</code> folder to update the vector store with new or modified content.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <button 
            onClick={handleIngest} 
            disabled={ingesting}
            style={{ 
              padding: '0.6rem 1.2rem', 
              cursor: 'pointer',
              background: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '600'
            }}
          >
            {ingesting ? 'Indexing...' : 'Re-Ingest Documents'}
          </button>
          
          <label style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={ingestOptions.force} 
              onChange={e => setIngestOptions(prev => ({ ...prev, force: e.target.checked }))}
              style={{ marginRight: '5px' }}
            />
            Force Rebuild
          </label>

          <button 
            onClick={handleClearCache}
            style={{ 
              padding: '0.6rem 1.2rem', 
              cursor: 'pointer',
              background: 'white',
              color: '#d32f2f',
              border: '1px solid #d32f2f',
              borderRadius: '4px',
              marginLeft: 'auto'
            }}
          >
            Clear Cache
          </button>
        </div>

        {ingestProgress && (
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
              {ingestProgress.count} / {ingestProgress.total} Files
            </div>
            <div style={{ fontSize: '0.85rem', color: '#555' }}>
              {ingestProgress.current}
            </div>
            <div style={{ height: '8px', background: '#e0e0e0', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: '#2e7d32', 
                width: `${(ingestProgress.count / ingestProgress.total) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

      <section className="benchmark-section" style={{ marginBottom: '2rem' }}>
        <h2>Accuracy Benchmarks</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Run automated tests against <code>benchmarks.json</code> to verify RAG retrieval and answer quality.
        </p>
        <button 
          onClick={handleBenchmark} 
          disabled={benchmarking}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {benchmarking ? 'Running Tests...' : 'Run Benchmarks'}
        </button>

        {benchmarkProgress && (
          <div style={{ marginTop: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              Progress: {benchmarkProgress.results.length} / {benchmarkProgress.total} (Passed: {benchmarkProgress.passed})
            </div>
            {benchmarkProgress.results.map((r, i) => (
              <div key={i} style={{ borderBottom: '1px solid #eee' }}>
                <div 
                  onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                  style={{ 
                    padding: '0.8rem', 
                    background: r.success ? '#f1f8e9' : '#ffebee',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{r.success ? '✅' : '❌'} <strong>Q:</strong> {r.question}</span>
                  <span style={{ color: '#666', fontSize: '0.8rem' }}>
                    (Conf: {r.confidence.toFixed(3)}) {expandedResult === i ? '▲' : '▼'}
                  </span>
                </div>
                {expandedResult === i && (
                  <div style={{ padding: '1rem', background: '#fafafa', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Actual Answer:</strong>
                      <p style={{ margin: '5px 0', color: '#444' }}>{r.actualAnswer}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <strong>Expected Citations:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '1.2rem' }}>
                          {r.expectedCitations?.map((c, idx) => <li key={idx}>{c}</li>)}
                        </ul>
                      </div>
                      <div>
                        <strong>Actual Citations:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '1.2rem' }}>
                          {r.actualCitations?.map((c, idx) => <li key={idx}>{c}</li>)}
                        </ul>
                      </div>
                    </div>
                    {r.expectedKeywords?.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>Expected Keywords:</strong> {r.expectedKeywords.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

      <section className="verify-section">
        <h2>Model Integrity & Connectivity</h2>
        <p>Check if local ONNX weights are valid and OpenRouter is reachable.</p>
        <button 
          onClick={handleVerify} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {loading ? 'Verifying Pipeline...' : 'Run Diagnostics'}
        </button>

        {verifyResults && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Local Model Status</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {verifyResults.local.map((m, i) => (
                <li key={i} style={{ marginBottom: '0.5rem', color: m.ok ? '#2e7d32' : '#d32f2f' }}>
                  {m.ok ? '✅' : '❌'} <strong>{m.name}</strong>: {m.ok ? 'Validated' : m.error}
                </li>
              ))}
            </ul>

            {verifyResults.remote && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                <h3>Cloud Connectivity (Mode: {verifyResults.mode})</h3>
                <p style={{ color: verifyResults.remote.ok ? '#2e7d32' : '#d32f2f' }}>
                  {verifyResults.remote.ok ? '✅' : '❌'} {verifyResults.remote.message}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Settings;