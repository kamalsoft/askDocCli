import React, { useState, useEffect } from 'react';

const Docs = () => {
  const [files, setFiles] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch('/api/docs/list').then(res => res.json()).then(setFiles);
  }, []);

  const loadFile = (name) => {
    fetch(`/api/docs/get?name=${name}`).then(res => res.text()).then(setContent);
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ width: '200px' }}>
        {files.map(f => (
          <div key={f} onClick={() => loadFile(f)} style={{ cursor: 'pointer', padding: '5px' }}>{f}</div>
        ))}
      </div>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #eee', padding: '20px', whiteSpace: 'pre-wrap' }}>
        {content || 'Select a file to view content'}
      </div>
    </div>
  );
};
export default Docs;