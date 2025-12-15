import React, { useMemo } from 'react';

// Simple VideoEditor component
const VideoEditor = ({ 
  projectId = 'my-video',
  width = 1080,      // Instagram Reel width
  height = 1920,     // Instagram Reel height
  onSave 
}) => {
  
  const handleSave = (data) => {
    console.log('Video saved!', data);
    if (onSave) {
      onSave(data);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      backgroundColor: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <div>
        <h1>Video Editor</h1>
        <p>Project ID: {projectId}</p>
        <p>Size: {width} x {height}</p>
        <button 
          onClick={() => handleSave({ projectId, width, height })}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Save Project
        </button>
      </div>
    </div>
  );
};

export default VideoEditor;