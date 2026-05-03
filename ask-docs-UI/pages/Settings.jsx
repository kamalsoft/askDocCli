import React, { useState, useEffect } from 'react';

/**
 * Settings page for managing model verification and application configuration.
 */
const Settings = () => {
  const [config, setConfig] = useState(null);
  const [verifyResults, setVerifyResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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