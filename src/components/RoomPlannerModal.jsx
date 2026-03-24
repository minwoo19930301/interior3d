import React, { useState } from 'react';
import {
  UNIT_SYSTEMS,
  fromDisplayValue,
  toDisplayValue,
} from '../lib/objectCatalog';

const initialRoomState = {
  width: 4,
  depth: 4,
  wallHeight: 2.4,
  wallThickness: 0.12,
  includeFloor: true,
  includeCeiling: false,
  openings: {
    north: false,
    east: false,
    south: false,
    west: false,
  },
};

function WallToggle({ label, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: isOpen ? '#22334a' : '#1a212c',
        color: '#fff',
      }}
    >
      {label}: {isOpen ? 'Open' : 'Wall'}
    </button>
  );
}

const RoomPlannerModal = ({ isOpen, unitSystem, onClose, onCreate }) => {
  const [roomState, setRoomState] = useState(initialRoomState);
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;

  if (!isOpen) {
    return null;
  }

  const updateDimension = (key, rawValue) => {
    const nextValue = fromDisplayValue(rawValue, unitSystem);

    setRoomState((current) => ({
      ...current,
      [key]: nextValue,
    }));
  };

  const toggleBoolean = (key) => {
    setRoomState((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const toggleOpening = (key) => {
    setRoomState((current) => ({
      ...current,
      openings: {
        ...current.openings,
        [key]: !current.openings[key],
      },
    }));
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(5, 8, 12, 0.68)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          background: '#11161f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          padding: '24px',
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '18px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Room Planner</h2>
            <p style={{ margin: '8px 0 0 0', color: '#8c99ad', fontSize: '0.9rem' }}>
              Set room size and decide which sides stay open.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '999px',
              background: '#1a212c',
              color: '#fff',
              padding: '0.45rem 0.9rem',
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: '20px',
          }}
        >
          <div
            style={{
              padding: '18px',
              borderRadius: '18px',
              background: '#161d27',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <WallToggle
              label="North"
              isOpen={roomState.openings.north}
              onToggle={() => toggleOpening('north')}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 110px',
                alignItems: 'center',
                gap: '12px',
                margin: '12px 0',
              }}
            >
              <WallToggle
                label="West"
                isOpen={roomState.openings.west}
                onToggle={() => toggleOpening('west')}
              />

              <div
                style={{
                  minHeight: '190px',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background:
                    'linear-gradient(180deg, rgba(42,54,71,0.58) 0%, rgba(23,31,42,0.76) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {toDisplayValue(roomState.width, unitSystem)} x{' '}
                  {toDisplayValue(roomState.depth, unitSystem)} {unit.label}
                </div>
                <div style={{ color: '#8fa0b8', fontSize: '0.82rem' }}>
                  Height {toDisplayValue(roomState.wallHeight, unitSystem)} {unit.label}
                </div>
              </div>

              <WallToggle
                label="East"
                isOpen={roomState.openings.east}
                onToggle={() => toggleOpening('east')}
              />
            </div>

            <WallToggle
              label="South"
              isOpen={roomState.openings.south}
              onToggle={() => toggleOpening('south')}
            />
          </div>

          <div
            style={{
              padding: '18px',
              borderRadius: '18px',
              background: '#161d27',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {[
              ['width', 'Width'],
              ['depth', 'Depth'],
              ['wallHeight', 'Wall Height'],
              ['wallThickness', 'Wall Thickness'],
            ].map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: '#aab5c4',
                  fontSize: '0.82rem',
                }}
              >
                {label}
                <input
                  type="number"
                  min="0"
                  step={unit.step}
                  value={toDisplayValue(roomState[key], unitSystem)}
                  onChange={(event) => updateDimension(key, event.target.value)}
                  style={{
                    width: '100%',
                    background: '#1d2430',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: '10px',
                  }}
                />
              </label>
            ))}

            <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={roomState.includeFloor}
                onChange={() => toggleBoolean('includeFloor')}
              />
              <span>Include floor</span>
            </label>

            <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={roomState.includeCeiling}
                onChange={() => toggleBoolean('includeCeiling')}
              />
              <span>Include ceiling</span>
            </label>

            <button
              onClick={() => onCreate(roomState)}
              style={{
                marginTop: 'auto',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: '#4064e8',
                color: '#fff',
              }}
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPlannerModal;
