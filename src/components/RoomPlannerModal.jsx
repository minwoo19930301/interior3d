import React, { useMemo, useState } from 'react';
import {
  UNIT_SYSTEMS,
  fromDisplayValue,
  toDisplayValue,
} from '../lib/objectCatalog';
import {
  HOUSE_TEMPLATES,
  getDefaultHouseSize,
  getHouseTemplate,
} from '../lib/roomBuilder';

function createPlannerState(templateId) {
  const suggestedSize = getDefaultHouseSize(templateId);

  return {
    templateId,
    width: suggestedSize.width,
    depth: suggestedSize.depth,
    wallHeight: 2.5,
    wallThickness: 0.12,
    includeFloor: true,
    includeCeiling: false,
    includeDoors: true,
    includeOuterWalls: true,
    replaceExisting: true,
  };
}

function TemplatePreview({ template, widthScale, depthScale }) {
  const previewWidth = 280;
  const previewHeight = 220;
  const inset = 16;
  const scale = Math.min(
    (previewWidth - inset * 2) / (template.footprint.width * widthScale),
    (previewHeight - inset * 2) / (template.footprint.depth * depthScale),
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
        const width = room.width * widthScale * scale;
        const height = room.depth * depthScale * scale;
        const left = originX + room.x * widthScale * scale - width / 2;
        const top = originY + room.z * depthScale * scale - height / 2;

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
  const [plannerState, setPlannerState] = useState(() =>
    createPlannerState(HOUSE_TEMPLATES[0].id),
  );
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  const selectedTemplate = useMemo(
    () => getHouseTemplate(plannerState.templateId),
    [plannerState.templateId],
  );
  const widthScale = plannerState.width / selectedTemplate.footprint.width;
  const depthScale = plannerState.depth / selectedTemplate.footprint.depth;

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
    const nextValue = fromDisplayValue(rawValue, unitSystem);
    const minimums = {
      width: selectedTemplate.footprint.width * 0.7,
      depth: selectedTemplate.footprint.depth * 0.7,
      wallHeight: 2.1,
      wallThickness: 0.08,
    };
    const maximums = {
      width: selectedTemplate.footprint.width * 2.2,
      depth: selectedTemplate.footprint.depth * 2.2,
      wallHeight: 4,
      wallThickness: 0.4,
    };

    updatePlanner({
      [key]: Math.min(
        maximums[key] ?? nextValue,
        Math.max(minimums[key] ?? 0.1, nextValue),
      ),
    });
  };

  const applyTemplate = (templateId) => {
    const suggestedSize = getDefaultHouseSize(templateId);

    setPlannerState((current) => ({
      ...current,
      templateId,
      width: suggestedSize.width,
      depth: suggestedSize.depth,
    }));
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
        zIndex: 30,
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
              Start with a full-house template, then tune the footprint before placing furniture.
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                  onClick={() => applyTemplate(template.id)}
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
                    Base {toDisplayValue(template.footprint.width, unitSystem)} x{' '}
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

              <TemplatePreview
                template={selectedTemplate}
                widthScale={widthScale}
                depthScale={depthScale}
              />

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
                  Width {toDisplayValue(plannerState.width, unitSystem)} {unit.label}
                </div>
                <div>
                  Depth {toDisplayValue(plannerState.depth, unitSystem)} {unit.label}
                </div>
                <div>Zones {selectedTemplate.rooms.length}</div>
              </div>
            </div>

            <div
              style={{
                padding: '18px',
                borderRadius: '18px',
                background: '#161d27',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                Width ({unit.label})
                <input
                  type="number"
                  min="0"
                  step={unit.step}
                  value={toDisplayValue(plannerState.width, unitSystem)}
                  onChange={(event) => updateMeasuredValue('width', event.target.value)}
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
                Depth ({unit.label})
                <input
                  type="number"
                  min="0"
                  step={unit.step}
                  value={toDisplayValue(plannerState.depth, unitSystem)}
                  onChange={(event) => updateMeasuredValue('depth', event.target.value)}
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
                  gridColumn: '1 / -1',
                }}
              >
                {[
                  ['includeFloor', 'Include floor'],
                  ['includeCeiling', 'Include ceiling'],
                  ['includeOuterWalls', 'Include outer walls'],
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
