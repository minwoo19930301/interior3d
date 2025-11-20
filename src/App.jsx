import React from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#1a1a1a', overflow: 'hidden' }}>
        <Sidebar />

        <div style={{ flex: 1, position: 'relative' }}>
          <Scene />

          {/* Overlay Header */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'rgba(0,0,0,0.6)',
            padding: '10px 20px',
            borderRadius: '8px',
            color: 'white',
            pointerEvents: 'none'
          }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem' }}>3D Interior App</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Drag & Drop furniture • Click to select • Use Gizmo to move</p>
          </div>
        </div>

        <PropertiesPanel />
      </div>
    </ErrorBoundary>
  );
}

export default App;
