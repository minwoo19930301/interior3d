import React, { useEffect, useState } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import ErrorBoundary from './components/ErrorBoundary';
import useStore from './store/useStore';
import { buildSceneUrl, syncSceneToUrl } from './lib/sceneUrl';

const badgeStyle = {
  padding: '0.55rem 0.85rem',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(15,18,24,0.88)',
  color: '#f5f7fa',
  fontSize: '0.82rem',
};

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', 'true');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  return Promise.resolve();
}

function App() {
  const objects = useStore((state) => state.objects);
  const unitSystem = useStore((state) => state.unitSystem);
  const setUnitSystem = useStore((state) => state.setUnitSystem);
  const transformMode = useStore((state) => state.transformMode);
  const setTransformMode = useStore((state) => state.setTransformMode);
  const [shareStatus, setShareStatus] = useState('idle');

  useEffect(() => {
    syncSceneToUrl({ objects, unitSystem });
  }, [objects, unitSystem]);

  useEffect(() => {
    if (shareStatus !== 'copied') {
      return undefined;
    }

    const timeout = window.setTimeout(() => setShareStatus('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  const handleCopyShareLink = async () => {
    try {
      await copyText(buildSceneUrl({ objects, unitSystem }));
      setShareStatus('copied');
    } catch {
      setShareStatus('error');
    }
  };

  return (
    <ErrorBoundary>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          background:
            'radial-gradient(circle at top, #1d2330 0%, #11151d 38%, #0b0f15 100%)',
          overflow: 'hidden',
        }}
      >
        <Sidebar />

        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <Scene />

          <div
            style={{
              position: 'absolute',
              top: 18,
              left: 18,
              right: 18,
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              alignItems: 'flex-start',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '20px',
                background: 'rgba(10,14,20,0.82)',
                color: '#f5f7fa',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.24)',
                maxWidth: '460px',
                pointerEvents: 'auto',
                backdropFilter: 'blur(16px)',
              }}
            >
              <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Interior 3D Planner</h1>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  color: '#b8c2cf',
                }}
              >
                Add walls, rotate furniture, switch between meters and
                centimeters, and share the current layout by URL.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', ...badgeStyle }}>
                <span style={{ color: '#8fa2bd' }}>Mode</span>
                <button
                  onClick={() => setTransformMode('translate')}
                  style={{
                    border: 'none',
                    padding: '0.35rem 0.7rem',
                    background:
                      transformMode === 'translate' ? '#e08a4f' : 'transparent',
                    color: '#fff',
                  }}
                >
                  Move
                </button>
                <button
                  onClick={() => setTransformMode('rotate')}
                  style={{
                    border: 'none',
                    padding: '0.35rem 0.7rem',
                    background:
                      transformMode === 'rotate' ? '#e08a4f' : 'transparent',
                    color: '#fff',
                  }}
                >
                  Rotate
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', ...badgeStyle }}>
                <span style={{ color: '#8fa2bd' }}>Units</span>
                <button
                  onClick={() => setUnitSystem('m')}
                  style={{
                    border: 'none',
                    padding: '0.35rem 0.7rem',
                    background: unitSystem === 'm' ? '#4b83ff' : 'transparent',
                    color: '#fff',
                  }}
                >
                  m
                </button>
                <button
                  onClick={() => setUnitSystem('cm')}
                  style={{
                    border: 'none',
                    padding: '0.35rem 0.7rem',
                    background: unitSystem === 'cm' ? '#4b83ff' : 'transparent',
                    color: '#fff',
                  }}
                >
                  cm
                </button>
              </div>

              <button
                onClick={handleCopyShareLink}
                style={{
                  ...badgeStyle,
                  pointerEvents: 'auto',
                  background: shareStatus === 'copied' ? '#1f7a5b' : '#141922',
                }}
              >
                {shareStatus === 'copied'
                  ? 'Link copied'
                  : shareStatus === 'error'
                    ? 'Copy failed'
                    : 'Copy share link'}
              </button>

              <div style={{ ...badgeStyle, color: '#8fa2bd' }}>
                {objects.length} items
              </div>
            </div>
          </div>
        </div>

        <PropertiesPanel />
      </div>
    </ErrorBoundary>
  );
}

export default App;
