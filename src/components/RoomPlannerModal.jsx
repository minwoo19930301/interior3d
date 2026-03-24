import React, { useMemo, useState } from 'react';
import {
  UNIT_SYSTEMS,
  fromDisplayValue,
  toDisplayValue,
} from '../lib/objectCatalog';
import { HOUSE_TEMPLATES, getHouseTemplate } from '../lib/roomBuilder';

const initialPlannerState = {
  templateId: HOUSE_TEMPLATES[0].id,
  scale: 1,
  wallHeight: 2.5,
  wallThickness: 0.12,
  includeFloor: true,
  includeCeiling: false,
  includeDoors: true,
  replaceExisting: true,
};

function TemplatePreview({ template }) {
  const previewWidth = 280;
  const previewHeight = 220;
  const inset = 16;
  const scale = Math.min(
    (previewWidth - inset * 2) / template.footprint.width,
    (previewHeight - inset * 2) / template.footprint.depth,
  );
  const originX = previewWidth / 2;
  const originY = previewHeight / 2;

  return (
    <div
      style={{
        width: '100%',
        height: `${previewHeight}px`,
        borderRadius: '18px',
        background:
          'linear-gradient(180deg, rgba(31,41,55,0.95) 0%, rgba(17,24,39,0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          opacity: 0.5,
        }}
      />

      {template.rooms.map((room) => {
        const width = room.width * scale;
        const height = room.depth * scale;
        const left = originX + room.x * scale - width / 2;
        const top = originY + room.z * scale - height / 2;

        return (
          <div
            key={`${template.id}-${room.label}-${room.x}-${room.z}`}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.16)',
              background:
                room.accent
                  ? `${room.accent}cc`
                  : 'linear-gradient(180deg, rgba(102,132,175,0.34) 0%, rgba(58,76,102,0.28) 100%)',
              color: '#f7fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              textAlign: 'center',
              padding: '6px',
            }}
          >
            {room.label}
          </div>
        );
      })}
    </div>
  );
}

const RoomPlannerModal = ({ isOpen, unitSystem, onClose, onCreate }) => {
  const [plannerState, setPlannerState] = useState(initialPlannerState);
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  const selectedTemplate = useMemo(
    () => getHouseTemplate(plannerState.templateId),
    [plannerState.templateId],
  );

  if (!isOpen) {
    return null;
  }

  const updatePlanner = (patch) => {
    setPlannerState((current) => ({
      ...current,
      ...patch,
    }));
  };

  const updateMeasuredValue = (key, rawValue) => {
    updatePlanner({
      [key]: fromDisplayValue(rawValue, unitSystem),
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(5, 8, 12, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(980px, 100%)',
          maxHeight: 'min(760px, calc(100vh - 48px))',
          overflowY: 'auto',
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
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>House Planner</h2>
            <p style={{ margin: '8px 0 0 0', color: '#8c99ad', fontSize: '0.9rem' }}>
              Pick a full home template, then adjust wall size, ceiling, and doors.
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
            gridTemplateColumns: 'minmax(260px, 0.9fr) minmax(320px, 1.1fr)',
            gap: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {HOUSE_TEMPLATES.map((template) => {
              const isSelected = template.id === plannerState.templateId;

              return (
                <button
                  key={template.id}
                  onClick={() => updatePlanner({ templateId: template.id })}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: isSelected
                      ? '1px solid rgba(79,140,255,0.7)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? '#192538' : '#161d27',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    {template.label}
                  </span>
                  <span style={{ color: '#8fa0b8', fontSize: '0.8rem', lineHeight: 1.45 }}>
                    {template.description}
                  </span>
                  <span style={{ color: '#677489', fontSize: '0.72rem' }}>
                    {toDisplayValue(template.footprint.width, unitSystem)} x{' '}
                    {toDisplayValue(template.footprint.depth, unitSystem)} {unit.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div
              style={{
                padding: '18px',
                borderRadius: '18px',
                background: '#161d27',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {selectedTemplate.label}
                </div>
                <div style={{ marginTop: '6px', color: '#8fa0b8', fontSize: '0.84rem' }}>
                  {selectedTemplate.description}
                </div>
              </div>

              <TemplatePreview template={selectedTemplate} />

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                  color: '#9cb0c9',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  Width {toDisplayValue(selectedTemplate.footprint.width * plannerState.scale, unitSystem)} {unit.label}
                </div>
                <div>
                  Depth {toDisplayValue(selectedTemplate.footprint.depth * plannerState.scale, unitSystem)} {unit.label}
                </div>
                <div>Rooms {selectedTemplate.rooms.length}</div>
              </div>
            </div>

            <div
              style={{
                padding: '18px',
                borderRadius: '18px',
                background: '#161d27',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: '#aab5c4',
                  fontSize: '0.82rem',
                }}
              >
                Scale
                <input
                  type="number"
                  min="0.7"
                  max="1.6"
                  step="0.05"
                  value={plannerState.scale}
                  onChange={(event) =>
                    updatePlanner({
                      scale: Math.max(0.7, Math.min(1.6, Number(event.target.value) || 1)),
                    })
                  }
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

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: '#aab5c4',
                  fontSize: '0.82rem',
                }}
              >
                Wall Height ({unit.label})
                <input
                  type="number"
                  min="0"
                  step={unit.step}
                  value={toDisplayValue(plannerState.wallHeight, unitSystem)}
                  onChange={(event) => updateMeasuredValue('wallHeight', event.target.value)}
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

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: '#aab5c4',
                  fontSize: '0.82rem',
                }}
              >
                Wall Thickness ({unit.label})
                <input
                  type="number"
                  min="0"
                  step={unit.step}
                  value={toDisplayValue(plannerState.wallThickness, unitSystem)}
                  onChange={(event) =>
                    updateMeasuredValue('wallThickness', event.target.value)
                  }
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

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                {[
                  ['includeFloor', 'Include floor'],
                  ['includeCeiling', 'Include ceiling'],
                  ['includeDoors', 'Add doors'],
                  ['replaceExisting', 'Replace current scene'],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      color: '#dce3ec',
                      fontSize: '0.86rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={plannerState[key]}
                      onChange={() => updatePlanner({ [key]: !plannerState[key] })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#161d27',
              color: '#fff',
              padding: '0.75rem 1rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(plannerState)}
            style={{
              borderRadius: '12px',
              border: 'none',
              background: '#4b83ff',
              color: '#fff',
              padding: '0.75rem 1.1rem',
              fontWeight: 700,
            }}
          >
            Build house
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPlannerModal;
