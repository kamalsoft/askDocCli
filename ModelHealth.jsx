import React, { useState, useEffect } from 'react';

const ModelHealth = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    console.log('[ModelHealth] Fetching system status...');
    setLoading(true);
    try {
      const response = await fetch('/api/models/summary');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      console.log('[ModelHealth] Health check successful:', data);
      setStatus(data);
    } catch (err) {
      console.error('[ModelHealth] Health check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        <button onClick={fetchHealth} className="text-xs bg-white dark:bg-gray-700 border px-2 py-1 rounded hover:bg-gray-50">Refresh</button>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InfoBox label="Active Reasoning" value={status.activeModel} />
          <InfoBox label="Inference Engine" value={status.inferenceMode} highlight />
        </div>

        <Section title="Reasoning Models" data={status.reasoningModels} />
        <Section title="Embedding Models" data={status.embeddingModels} />
        
        <div className="text-[10px] text-gray-400 font-mono truncate">Root: {status.modelsPath}</div>
      </div>
    </div>
  );
};

const InfoBox = ({ label, value, highlight }) => (
  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
    <div className="text-[10px] uppercase text-gray-400 font-bold">{label}</div>
    <div className={`text-sm font-mono truncate ${highlight ? 'text-blue-500 font-bold' : ''}`}>{value}</div>
  </div>
);

const Section = ({ title, data }) => (
  <div>
    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">{title}</h3>
    <div className="space-y-2">
      {Object.entries(data).map(([id, info]) => (
        <ModelRow key={id} id={id} info={info} />
      ))}
    </div>
  </div>
);

const ModelRow = ({ id, info }) => {
  const file = info.mainFile;
  const isHealthy = file.exists && !file.isLfsPointer;
  
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${isHealthy ? 'bg-green-50/20 border-green-100' : 'bg-red-50/20 border-red-100'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{info.name}</span>
          <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-500 font-mono">{id}</span>
        </div>
        <div className="text-[10px] mt-0.5">
          {!file.exists ? (
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
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Ready" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-red-500" title="Action Required" />
        )}
      </div>
    </div>
  );
};

export default ModelHealth;