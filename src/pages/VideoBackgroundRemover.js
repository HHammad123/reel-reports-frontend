import React, { useRef, useEffect, useState } from 'react';

function App() {
  const canvasRef = useRef(null);
  const videoRefs = useRef({});
  const rafRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [videosReady, setVideosReady] = useState({});

  // Scenes configuration
  const scenes = [
    {
      id: 'scene1',
      duration: 10,
      bgUrl: 'https://reelvideosdocs2.blob.core.windows.net/videosscenewise/28cac56e-8d2e-493e-a7fb-eb12936e2414/scene_02/final/scene_02_final.mp4',
      chartUrl: null,
    },
    {
      id: 'scene2',
      duration: 10,
      bgUrl: 'https://reelvideosdocs2.blob.core.windows.net/videosscenewise/28cac56e-8d2e-493e-a7fb-eb12936e2414/scene_03/final/scene_03_final.mp4',
      chartUrl: null,
    },
    {
      id: 'scene3',
      duration: 10,
      bgUrl: 'https://reelvideosdocs2.blob.core.windows.net/videosscenewise/28cac56e-8d2e-493e-a7fb-eb12936e2414/scene_04/final/scene_04_final.mp4',
      chartUrl: 'https://reelvideosdocs2.blob.core.windows.net/videosscenewise/28cac56e-8d2e-493e-a7fb-eb12936e2414/scene_04/chart/scene_04_chart.mp4',
      chartBox: { x: 0.25, y: 0.15, width: 0.5, height: 0.6 }
    },
    {
      id: 'scene4',
      duration: 10,
      bgUrl: 'https://reelvideosdocs2.blob.core.windows.net/videosscenewise/28cac56e-8d2e-493e-a7fb-eb12936e2414/scene_06/final/scene_06_final.mp4',
      chartUrl: null,
    }
  ];

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  // Get scene start times
  const getSceneStartTime = (index) => {
    return scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
  };

  // Get current scene from global time
  const getCurrentSceneFromTime = (time) => {
    let accumulated = 0;
    for (let i = 0; i < scenes.length; i++) {
      accumulated += scenes[i].duration;
      if (time < accumulated) return i;
    }
    return scenes.length - 1;
  };

  // Get local time in scene
  const getLocalTime = (globalTime, sceneIndex) => {
    return globalTime - getSceneStartTime(sceneIndex);
  };

  // Video loading
  useEffect(() => {
    const loadPromises = [];

    scenes.forEach((scene) => {
      const bgVideo = videoRefs.current[`${scene.id}-bg`];
      const chartVideo = videoRefs.current[`${scene.id}-chart`];

      if (bgVideo) {
        const bgPromise = new Promise((resolve) => {
          const handleLoad = () => {
            console.log(`✅ Loaded: ${scene.id} background`);
            setVideosReady(prev => ({ ...prev, [`${scene.id}-bg`]: true }));
            resolve();
          };
          
          if (bgVideo.readyState >= 2) {
            handleLoad();
          } else {
            bgVideo.addEventListener('loadeddata', handleLoad, { once: true });
          }
        });
        loadPromises.push(bgPromise);
      }

      if (chartVideo) {
        const chartPromise = new Promise((resolve) => {
          const handleLoad = () => {
            console.log(`✅ Loaded: ${scene.id} chart`);
            setVideosReady(prev => ({ ...prev, [`${scene.id}-chart`]: true }));
            resolve();
          };
          
          if (chartVideo.readyState >= 2) {
            handleLoad();
          } else {
            chartVideo.addEventListener('loadeddata', handleLoad, { once: true });
          }
        });
        loadPromises.push(chartPromise);
      }
    });

    return () => {
      // Cleanup
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 1920;
    canvas.height = 1080;

    const render = () => {
      const sceneIdx = getCurrentSceneFromTime(currentTime);
      const scene = scenes[sceneIdx];
      const localTime = getLocalTime(currentTime, sceneIdx);

      const bgVideo = videoRefs.current[`${scene.id}-bg`];
      const chartVideo = videoRefs.current[`${scene.id}-chart`];

      // Update scene index
      if (sceneIdx !== currentSceneIndex) {
        setCurrentSceneIndex(sceneIdx);
        console.log(`Switched to scene ${sceneIdx + 1}`);
      }

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background video
      if (bgVideo && bgVideo.readyState >= 2) {
        ctx.drawImage(bgVideo, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
      }

      // Draw chart if exists
      if (chartVideo && chartVideo.readyState >= 2 && scene.chartBox) {
        const x = scene.chartBox.x * canvas.width;
        const y = scene.chartBox.y * canvas.height;
        const w = scene.chartBox.width * canvas.width;
        const h = scene.chartBox.height * canvas.height;

        // Simple overlay without masking for now
        ctx.globalAlpha = 0.9;
        ctx.drawImage(chartVideo, x, y, w, h);
        ctx.globalAlpha = 1.0;
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [currentTime, currentSceneIndex]);

  // Playback control
  useEffect(() => {
    let interval;

    if (isPlaying) {
      const sceneIdx = getCurrentSceneFromTime(currentTime);
      const scene = scenes[sceneIdx];
      const localTime = getLocalTime(currentTime, sceneIdx);

      const bgVideo = videoRefs.current[`${scene.id}-bg`];
      const chartVideo = videoRefs.current[`${scene.id}-chart`];

      // Set video times
      if (bgVideo) {
        bgVideo.currentTime = localTime;
        bgVideo.play().catch(err => console.error('Play error:', err));
      }

      if (chartVideo) {
        chartVideo.currentTime = localTime;
        chartVideo.play().catch(err => console.error('Chart play error:', err));
      }

      // Update time
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.033; // ~30fps
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }, 33);
    } else {
      // Pause all videos
      scenes.forEach(scene => {
        const bgVideo = videoRefs.current[`${scene.id}-bg`];
        const chartVideo = videoRefs.current[`${scene.id}-chart`];
        if (bgVideo) bgVideo.pause();
        if (chartVideo) chartVideo.pause();
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTime]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    setIsPlaying(false);
  };

  const formatTime = (t) => {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const allReady = scenes.every(s => {
    const bgReady = videosReady[`${s.id}-bg`];
    const chartReady = s.chartUrl ? videosReady[`${s.id}-chart`] : true;
    return bgReady && chartReady;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Multi-Scene Video Player</h1>
      
      {/* Status */}
      <div style={{ marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Loading Status:</h3>
        {scenes.map((s, i) => (
          <div key={s.id} style={{ 
            marginBottom: '5px',
            fontWeight: i === currentSceneIndex ? 'bold' : 'normal',
            color: i === currentSceneIndex ? '#4CAF50' : '#666'
          }}>
            {i === currentSceneIndex ? '▶ ' : ''}Scene {i + 1}: 
            {videosReady[`${s.id}-bg`] ? ' ✅' : ' ⏳'} Background
            {s.chartUrl && (videosReady[`${s.id}-chart`] ? ' ✅' : ' ⏳') + ' Chart'}
          </div>
        ))}
        <div style={{ marginTop: '10px', padding: '10px', background: allReady ? '#e8f5e9' : '#fff3e0', borderRadius: '4px' }}>
          {allReady ? '✅ All videos loaded!' : '⏳ Loading videos...'}
        </div>
      </div>

      {/* Hidden videos */}
      {scenes.map(scene => (
        <React.Fragment key={scene.id}>
          <video
            ref={el => videoRefs.current[`${scene.id}-bg`] = el}
            src={scene.bgUrl}
            style={{ display: 'none' }}
            muted
            crossOrigin="anonymous"
            playsInline
            preload="auto"
          />
          {scene.chartUrl && (
            <video
              ref={el => videoRefs.current[`${scene.id}-chart`] = el}
              src={scene.chartUrl}
              style={{ display: 'none' }}
              muted
              crossOrigin="anonymous"
              playsInline
              preload="auto"
            />
          )}
        </React.Fragment>
      ))}

      {/* Canvas */}
      <div style={{ marginBottom: '20px', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '4px',
            background: '#000'
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button
          onClick={handlePlayPause}
          disabled={!allReady}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '20px',
            fontWeight: 'bold',
            background: isPlaying ? '#ff9800' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: allReady ? 'pointer' : 'not-allowed',
            marginBottom: '15px',
            opacity: allReady ? 1 : 0.5
          }}
        >
          {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ minWidth: '45px', fontWeight: 'bold' }}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!allReady}
            style={{ 
              flex: 1, 
              height: '8px',
              cursor: allReady ? 'pointer' : 'not-allowed'
            }}
          />
          <span style={{ minWidth: '45px', fontWeight: 'bold' }}>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Timeline</h3>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
          {scenes.map((s, i) => (
            <div
              key={s.id}
              onClick={() => {
                setCurrentTime(getSceneStartTime(i));
                setIsPlaying(false);
              }}
              style={{
                flex: s.duration,
                padding: '15px 10px',
                background: i === currentSceneIndex ? '#4CAF50' : '#e0e0e0',
                color: i === currentSceneIndex ? 'white' : '#333',
                borderRadius: '6px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '14px',
                fontWeight: i === currentSceneIndex ? 'bold' : 'normal'
              }}
            >
              <div>Scene {i + 1}</div>
              <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>
                {formatTime(getSceneStartTime(i))} - {formatTime(getSceneStartTime(i) + s.duration)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '6px' }}>
          <strong>Current: Scene {currentSceneIndex + 1}</strong>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            Duration: {scenes[currentSceneIndex].duration}s
            {scenes[currentSceneIndex].chartUrl && ' | ✅ With Chart Overlay'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;