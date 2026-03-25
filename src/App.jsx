import React, { useEffect, useState } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import ErrorBoundary from './components/ErrorBoundary';
import RoomPlannerModal from './components/RoomPlannerModal';
import useStore from './store/useStore';
import { buildSceneUrl, syncSceneToUrl } from './lib/sceneUrl';
import { buildHouseObjects } from './lib/roomBuilder';
import { getObjectLabel, toDisplayValue } from './lib/objectCatalog';

const MOBILE_BREAKPOINT = 960;

const badgeStyle = {
  padding: '0.55rem 0.85rem',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(15,18,24,0.88)',
  color: '#f5f7fa',
  fontSize: '0.82rem',
};

const mobileButtonStyle = (active) => ({
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '999px',
  padding: '0.7rem 0.95rem',
  background: active ? '#4b83ff' : 'rgba(15,18,24,0.94)',
  color: '#fff',
  boxShadow: '0 16px 32px rgba(0,0,0,0.25)',
});

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

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;

  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  );
}

function actionButtonStyle(enabled) {
  return {
    border: 'none',
    padding: '0.35rem 0.7rem',
    background: enabled ? '#253042' : 'transparent',
    color: enabled ? '#fff' : '#718097',
    opacity: enabled ? 1 : 0.72,
  };
}

function App() {
  const objects = useStore((state) => state.objects);
  const selectedId = useStore((state) => state.selectedId);
  const unitSystem = useStore((state) => state.unitSystem);
  const setUnitSystem = useStore((state) => state.setUnitSystem);
  const transformMode = useStore((state) => state.transformMode);
  const setTransformMode = useStore((state) => state.setTransformMode);
  const clipboardObject = useStore((state) => state.clipboardObject);
  const historyPastLength = useStore((state) => state.historyPast.length);
  const copySelectedObject = useStore((state) => state.copySelectedObject);
  const pasteClipboardObject = useStore((state) => state.pasteClipboardObject);
  const addObjects = useStore((state) => state.addObjects);
  const replaceObjects = useStore((state) => state.replaceObjects);
  const removeObject = useStore((state) => state.removeObject);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const [shareStatus, setShareStatus] = useState('idle');
  const [isRoomPlannerOpen, setIsRoomPlannerOpen] = useState(() => objects.length === 0);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const selectedObject = objects.find((object) => object.id === selectedId);

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

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;

      setIsMobileLayout(nextIsMobile);

      if (!nextIsMobile) {
        setIsSidebarOpen(false);
        setIsPropertiesOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'escape') {
        setIsSidebarOpen(false);
        setIsPropertiesOpen(false);
        return;
      }

      if ((key === 'backspace' || key === 'delete') && selectedId) {
        event.preventDefault();
        removeObject(selectedId);
        return;
      }

      const hasModifier = event.metaKey || event.ctrlKey;

      if (!hasModifier) {
        return;
      }

      if (key === 'c') {
        event.preventDefault();
        copySelectedObject();
        return;
      }

      if (key === 'v') {
        event.preventDefault();
        pasteClipboardObject();
        return;
      }

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelectedObject, pasteClipboardObject, redo, removeObject, selectedId, undo]);

  const handleCopyShareLink = async () => {
    try {
      await copyText(buildSceneUrl({ objects, unitSystem }));
      setShareStatus('copied');
    } catch {
      setShareStatus('error');
    }
  };

  const handleCreateRoom = (roomConfig) => {
    const nextObjects = buildHouseObjects(roomConfig);

    if (roomConfig.replaceExisting) {
      replaceObjects(nextObjects);
    } else {
      addObjects(nextObjects);
    }

    setIsRoomPlannerOpen(false);
    setIsSidebarOpen(false);
    setIsPropertiesOpen(false);
  };

  const openPlanner = () => {
    setIsRoomPlannerOpen(true);
    setIsSidebarOpen(false);
    setIsPropertiesOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((current) => !current);
    setIsPropertiesOpen(false);
  };

  const toggleProperties = () => {
    setIsPropertiesOpen((current) => !current);
    setIsSidebarOpen(false);
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
        {!isMobileLayout ? <Sidebar onOpenRoomPlanner={openPlanner} /> : null}

        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <Scene />

          {isRoomPlannerOpen ? (
            <RoomPlannerModal
              isOpen={isRoomPlannerOpen}
              unitSystem={unitSystem}
              onClose={() => setIsRoomPlannerOpen(false)}
              onCreate={handleCreateRoom}
            />
          ) : null}

          <div
            style={{
              position: 'absolute',
              top: isMobileLayout ? 12 : 18,
              left: isMobileLayout ? 12 : 18,
              right: isMobileLayout ? 12 : 18,
              display: 'flex',
              flexDirection: isMobileLayout ? 'column' : 'row',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: isMobileLayout ? 'stretch' : 'flex-start',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ ...badgeStyle, color: '#9cb0c9' }}>
                Grid {toDisplayValue(1, unitSystem)} {unitSystem}
              </div>
              {!isMobileLayout ? (
                <div style={{ ...badgeStyle, color: '#9cb0c9' }}>
                  Scene {toDisplayValue(40, unitSystem)} x {toDisplayValue(40, unitSystem)} {unitSystem}
                </div>
              ) : null}
              {!isMobileLayout && selectedObject ? (
                <div style={{ ...badgeStyle, color: '#f5f7fa' }}>
                  {getObjectLabel(selectedObject.type)}{' '}
                  {toDisplayValue(selectedObject.dimensions[0], unitSystem)} x{' '}
                  {toDisplayValue(selectedObject.dimensions[1], unitSystem)} x{' '}
                  {toDisplayValue(selectedObject.dimensions[2], unitSystem)} {unitSystem}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: isMobileLayout ? 'flex-start' : 'flex-end',
                pointerEvents: 'auto',
                marginLeft: isMobileLayout ? 0 : 'auto',
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

              <div style={{ display: 'flex', gap: '8px', ...badgeStyle }}>
                <button
                  onClick={() => copySelectedObject()}
                  disabled={!selectedId}
                  style={actionButtonStyle(Boolean(selectedId))}
                >
                  Copy
                </button>
                <button
                  onClick={() => pasteClipboardObject()}
                  disabled={!clipboardObject}
                  style={actionButtonStyle(Boolean(clipboardObject))}
                >
                  Paste
                </button>
                <button
                  onClick={() => undo()}
                  disabled={historyPastLength === 0}
                  style={actionButtonStyle(historyPastLength > 0)}
                >
                  Undo
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

              {!isMobileLayout ? (
                <div style={{ ...badgeStyle, color: '#8fa2bd' }}>
                  {objects.length} items
                </div>
              ) : null}
            </div>
          </div>

          {isMobileLayout ? (
            <div
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'flex',
                gap: '10px',
                pointerEvents: 'auto',
                zIndex: 12,
                flexWrap: 'wrap',
              }}
            >
              <button onClick={toggleSidebar} style={mobileButtonStyle(isSidebarOpen)}>
                Structure
              </button>
              <button
                onClick={toggleProperties}
                style={mobileButtonStyle(isPropertiesOpen)}
              >
                Properties
              </button>
              <button onClick={openPlanner} style={mobileButtonStyle(false)}>
                House
              </button>
            </div>
          ) : null}

          {isMobileLayout && isSidebarOpen ? (
            <>
              <div
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(5, 8, 12, 0.52)',
                  zIndex: 18,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  bottom: 12,
                  zIndex: 19,
                  pointerEvents: 'auto',
                }}
              >
                <Sidebar
                  isMobile
                  onOpenRoomPlanner={openPlanner}
                  onClose={() => setIsSidebarOpen(false)}
                />
              </div>
            </>
          ) : null}

          {isMobileLayout && isPropertiesOpen ? (
            <>
              <div
                onClick={() => setIsPropertiesOpen(false)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(5, 8, 12, 0.52)',
                  zIndex: 18,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 12,
                  maxHeight: 'min(68vh, 620px)',
                  zIndex: 19,
                  pointerEvents: 'auto',
                }}
              >
                <PropertiesPanel
                  isMobile
                  onClose={() => setIsPropertiesOpen(false)}
                />
              </div>
            </>
          ) : null}
        </div>

        {!isMobileLayout ? <PropertiesPanel /> : null}
      </div>
    </ErrorBoundary>
  );
}

export default App;
