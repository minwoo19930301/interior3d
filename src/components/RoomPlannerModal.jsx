import React, { useMemo, useState } from 'react';
import {
  UNIT_SYSTEMS,
  fromDisplayValue,
  toDisplayValue,
} from '../lib/objectCatalog';
import { getBrowserLocale, t } from '../lib/i18n';
import {
  CUSTOM_TEMPLATE_ID,
  HOUSE_TEMPLATES,
  getCustomTemplatePreview,
  getDefaultHouseSize,
  getHouseTemplate,
  getTemplateDescription,
  getTemplateLabel,
  getTemplateRooms,
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
    includeOuterWalls: false,
    replaceExisting: true,
    customColumns: 3,
    customRows: 2,
  };
}

function getPreviewData(plannerState, locale) {
  if (plannerState.templateId === CUSTOM_TEMPLATE_ID) {
    return getCustomTemplatePreview(plannerState, locale);
  }

  const selectedTemplate = getHouseTemplate(plannerState.templateId);

  return {
    footprint: {
      width: selectedTemplate.footprint.width,
      depth: selectedTemplate.footprint.depth,
    },
    rooms: getTemplateRooms(selectedTemplate, locale),
  };
}

function TemplatePreview({ preview, widthScale, depthScale }) {
  const previewWidth = 280;
  const previewHeight = 220;
  const inset = 16;
  const scale = Math.min(
    (previewWidth - inset * 2) / (preview.footprint.width * widthScale),
    (previewHeight - inset * 2) / (preview.footprint.depth * depthScale),
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

      {preview.rooms.map((room) => {
        const width = room.width * widthScale * scale;
        const height = room.depth * depthScale * scale;
        const left = originX + room.x * widthScale * scale - width / 2;
        const top = originY + room.z * depthScale * scale - height / 2;

        return (
          <div
            key={`${room.labelText}-${room.x}-${room.z}`}
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
            {room.labelText}
          </div>
        );
      })}
    </div>
  );
}

const RoomPlannerModal = ({ isOpen, unitSystem, onClose, onCreate }) => {
  const locale = getBrowserLocale();
  const [plannerState, setPlannerState] = useState(() =>
    createPlannerState(HOUSE_TEMPLATES[0].id),
  );
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  const selectedTemplate = useMemo(
    () => getHouseTemplate(plannerState.templateId),
    [plannerState.templateId],
  );
  const preview = useMemo(
    () => getPreviewData(plannerState, locale),
    [locale, plannerState],
  );
  const widthScale = plannerState.width / preview.footprint.width;
  const depthScale = plannerState.depth / preview.footprint.depth;
  const isCustomTemplate = plannerState.templateId === CUSTOM_TEMPLATE_ID;

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
    const minimums = isCustomTemplate
      ? {
          width: 3.5,
          depth: 3.5,
          wallHeight: 2.1,
          wallThickness: 0.08,
        }
      : {
          width: Math.max(3.5, selectedTemplate.footprint.width * 0.5),
          depth: Math.max(3.5, selectedTemplate.footprint.depth * 0.5),
          wallHeight: 2.1,
          wallThickness: 0.08,
        };
    const maximums = isCustomTemplate
      ? {
          width: 24,
          depth: 24,
          wallHeight: 4.2,
          wallThickness: 0.4,
        }
      : {
          width: Math.min(24, selectedTemplate.footprint.width * 2.8),
          depth: Math.min(24, selectedTemplate.footprint.depth * 2.8),
          wallHeight: 4.2,
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
          width: 'min(1040px, 100%)',
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
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{t('ui_template_house', locale)}</h2>
            <p style={{ margin: '8px 0 0 0', color: '#8c99ad', fontSize: '0.9rem' }}>
              {t('ui_start_with_template', locale)}
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
            {t('ui_close', locale)}
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
                    {getTemplateLabel(template, locale)}
                  </span>
                  <span style={{ color: '#8fa0b8', fontSize: '0.8rem', lineHeight: 1.45 }}>
                    {getTemplateDescription(template, locale)}
                  </span>
                  <span style={{ color: '#677489', fontSize: '0.72rem' }}>
                    {t('ui_base', locale)} {toDisplayValue(template.footprint.width, unitSystem)} x{' '}
                    {toDisplayValue(template.footprint.depth, unitSystem)} {unit.label}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => applyTemplate(CUSTOM_TEMPLATE_ID)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '16px',
                borderRadius: '16px',
                border: plannerState.templateId === CUSTOM_TEMPLATE_ID
                  ? '1px solid rgba(79,140,255,0.7)'
                  : '1px dashed rgba(255,255,255,0.18)',
                background: plannerState.templateId === CUSTOM_TEMPLATE_ID ? '#192538' : '#141b24',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {t('ui_create_template', locale)}
              </span>
              <span style={{ color: '#8fa0b8', fontSize: '0.8rem', lineHeight: 1.45 }}>
                {t('ui_template_make', locale)}
              </span>
            </button>
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
                  {isCustomTemplate
                    ? t('ui_custom_template', locale)
                    : getTemplateLabel(selectedTemplate, locale)}
                </div>
                <div style={{ marginTop: '6px', color: '#8fa0b8', fontSize: '0.84rem' }}>
                  {isCustomTemplate
                    ? t('ui_custom_template_help', locale)
                    : getTemplateDescription(selectedTemplate, locale)}
                </div>
              </div>

              <TemplatePreview
                preview={preview}
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
                  {t('ui_width', locale)} {toDisplayValue(plannerState.width, unitSystem)} {unit.label}
                </div>
                <div>
                  {t('ui_depth', locale)} {toDisplayValue(plannerState.depth, unitSystem)} {unit.label}
                </div>
                <div>
                  {t('ui_zones', locale)} {preview.rooms.length}
                </div>
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
              {[
                ['width', t('ui_width', locale)],
                ['depth', t('ui_depth', locale)],
                ['wallHeight', t('ui_wall_height', locale)],
                ['wallThickness', t('ui_wall_thickness', locale)],
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
                  {label} ({unit.label})
                  <input
                    type="number"
                    min="0"
                    step={unit.step}
                    value={toDisplayValue(plannerState[key], unitSystem)}
                    onChange={(event) => updateMeasuredValue(key, event.target.value)}
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

              {isCustomTemplate ? (
                <>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      color: '#aab5c4',
                      fontSize: '0.82rem',
                    }}
                  >
                    {t('ui_columns', locale)}
                    <input
                      type="number"
                      min="1"
                      max="6"
                      step="1"
                      value={plannerState.customColumns}
                      onChange={(event) =>
                        updatePlanner({
                          customColumns: Math.max(1, Math.min(6, Number(event.target.value) || 1)),
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
                    {t('ui_rows', locale)}
                    <input
                      type="number"
                      min="1"
                      max="6"
                      step="1"
                      value={plannerState.customRows}
                      onChange={(event) =>
                        updatePlanner({
                          customRows: Math.max(1, Math.min(6, Number(event.target.value) || 1)),
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
                </>
              ) : null}

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
                  ['includeFloor', t('ui_include_floor', locale)],
                  ['includeCeiling', t('ui_include_ceiling', locale)],
                  ['includeOuterWalls', t('ui_include_outer_walls', locale)],
                  ['includeDoors', t('ui_add_doors', locale)],
                  ['replaceExisting', t('ui_replace_scene', locale)],
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
            {t('ui_cancel', locale)}
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
            {t('ui_build_house', locale)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPlannerModal;
