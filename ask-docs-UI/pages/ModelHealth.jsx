import React, { useState, useEffect } from 'react';

const ModelHealth = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({ openrouter: [], jina: [] });
  const [testingLatency, setTestingLatency] = useState(false);

  const fetchHealth = async (checkLatency = false) => {
    if (checkLatency) setTestingLatency(true);
    console.log(`[ModelHealth] Fetching system status${checkLatency ? ' with latency test' : ''}...`);
    setLoading(true);
    try {
      const response = await fetch(`/api/models/summary${checkLatency ? '?checkLatency=true' : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      console.log('[ModelHealth] Health check successful:', data);
      
      if (data.latency) {
        setHistory(prev => ({
          openrouter: [...prev.openrouter, data.latency.openrouter].slice(-10),
          jina: [...prev.jina, data.latency.jina].slice(-10)
        }));
      }
      
      setStatus(data);
    } catch (err) {
      console.error('[ModelHealth] Health check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setTestingLatency(false);
    }
  };

  const clearHistory = () => {
    console.log('[ModelHealth] Clearing latency history...');
    setHistory({ openrouter: [], jina: [] });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) return <div className="p-4 animate-pulse text-gray-500">Scanning local models...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">Error: {error}</div>;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-bold text-gray-700 dark:text-gray-200">System Integrity</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchHealth(true)} 
            disabled={testingLatency}
            className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
          >
            {testingLatency ? 'Pinging...' : 'Test Latency'}
          </button>
          <button 
            onClick={clearHistory}
            className="text-xs bg-white dark:bg-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
          >
            Clear History
          </button>
          <button onClick={() => fetchHealth(false)} className="text-xs bg-white dark:bg-gray-700 border px-2 py-1 rounded hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InfoBox label="Active Reasoning" value={status.activeModel} />
          <InfoBox label="Inference Engine" value={status.inferenceMode} highlight />
        </div>

        <Section title="Reasoning Models" data={status.reasoningModels} status={status} history={history.openrouter} />
        <Section title="Embedding Models" data={status.embeddingModels} status={status} history={history.jina} isEmbedding />
        
        <div className="text-[10px] text-gray-400 font-mono truncate">Root: {status.modelsPath}</div>
      </div>
    </div>
  );
};

const Sparkline = ({ data }) => {
  const validData = data.filter(v => v !== null && v !== -1);
  if (validData.length < 2) return null;
  const max = Math.max(...validData, 100);
  const min = Math.min(...validData, 0);
  const points = validData.map((val, i) => {
    const x = (i / (validData.length - 1)) * 100;
    const y = 20 - ((val - min) / (max - min || 1)) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 20" className="w-16 h-3 text-blue-400 overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
};

const InfoBox = ({ label, value, highlight }) => (
  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
    <div className="text-[10px] uppercase text-gray-400 font-bold">{label}</div>
    <div className={`text-sm font-mono truncate ${highlight ? 'text-blue-500 font-bold' : ''}`}>{value}</div>
  </div>
);

const Section = ({ title, data, status, history, isEmbedding }) => (
  <div>
    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">{title}</h3>
    <div className="space-y-2">
      {Object.entries(data).map(([id, info]) => (
        <ModelRow key={id} id={id} info={info} status={status} history={history} isEmbedding={isEmbedding} />
      ))}
    </div>
  </div>
);

const ModelRow = ({ id, info, status, history, isEmbedding }) => {
  const file = info.mainFile;
  
  // Logic to determine if Cloud APIs are active for this model
  const cloudProvider = isEmbedding ? 'jina' : 'openrouter';
  const isCloudActive = isEmbedding 
    ? (status.isVercel || status.inferenceMode === 'openrouter') && status.cloudConfig.jina
    : (status.inferenceMode === 'openrouter' || status.inferenceMode === 'auto') && status.cloudConfig.openrouter;

  const latencyVal = status.latency ? status.latency[cloudProvider] : null;
  const isHealthy = (file.exists && !file.isLfsPointer) || isCloudActive;
  
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${isHealthy ? (isCloudActive ? 'bg-blue-50/20 border-blue-100' : 'bg-green-50/20 border-green-100') : 'bg-red-50/20 border-red-100'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{info.name}</span>
          <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-500 font-mono">{id}</span>
        </div>
        <div className="text-[10px] mt-0.5">
          {isCloudActive ? (
            <div className="flex items-center gap-2">
              <span className="text-blue-500 font-medium">☁️ Cloud Inference Active</span>
              {latencyVal !== null && (
                <span className={`font-mono ${latencyVal === -1 ? 'text-red-500' : 'text-gray-400'}`}>
                  ({latencyVal === -1 ? 'Offline' : `${latencyVal}ms`})
                </span>
              )}
              <Sparkline data={history} />
            </div>
          ) : !file.exists ? (
            <span className="text-red-500 font-medium">❌ Missing weight file</span>
          ) : file.isLfsPointer ? (
            <span className="text-amber-600 font-bold italic">⚠️ Git LFS Pointer Detected (Model weights not downloaded)</span>
          ) : (
            <span className="text-gray-500">Size: {file.sizeMb} MB</span>
          )}
        </div>
      </div>
      <div className="flex items-center">
        {isHealthy ? (
          <div className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`} title="Ready" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-red-500" title="Action Required" />
        )}
      </div>
    </div>
  );
};

export default ModelHealth;