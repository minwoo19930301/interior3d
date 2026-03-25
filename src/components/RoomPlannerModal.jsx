import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UNIT_SYSTEMS,
  fromDisplayValue,
  toDisplayValue,
} from '../lib/objectCatalog';
import { getBrowserLocale, t } from '../lib/i18n';
import {
  createEvenSegments,
  CUSTOM_TEMPLATE_ID,
  DEFAULT_CUSTOM_COLUMN_COUNT,
  DEFAULT_CUSTOM_ROW_COUNT,
  getCustomTemplatePreview,
  getDefaultHouseSize,
  getHouseTemplate,
  getTemplateDescription,
  getTemplateLabel,
  getTemplateRooms,
  MAX_CUSTOM_SECTIONS,
  normalizeCustomLayoutConfig,
  HOUSE_TEMPLATES,
} from '../lib/roomBuilder';

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 220;
const PREVIEW_INSET = 16;

function sumValues(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function roundValue(value) {
  return Math.round(value * 100) / 100;
}

function scaleSegmentsToTotal(sizes, nextTotal) {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return createEvenSegments(nextTotal, 1);
  }

  const currentTotal = sumValues(sizes);

  if (currentTotal <= 0) {
    return createEvenSegments(nextTotal, sizes.length);
  }

  return sizes.map((value) => roundValue((value / currentTotal) * nextTotal));
}

function splitLargestSegment(sizes) {
  if (sizes.length >= MAX_CUSTOM_SECTIONS) {
    return sizes;
  }

  const largestIndex = sizes.reduce(
    (bestIndex, value, index, list) =>
      value > list[bestIndex] ? index : bestIndex,
    0,
  );
  const nextSizes = [...sizes];
  const target = nextSizes[largestIndex];
  const firstHalf = roundValue(target / 2);
  const secondHalf = roundValue(target - firstHalf);

  nextSizes.splice(largestIndex, 1, firstHalf, secondHalf);
  return nextSizes;
}

function mergeSmallestSegment(sizes) {
  if (sizes.length <= 1) {
    return sizes;
  }

  const smallestIndex = sizes.reduce(
    (bestIndex, value, index, list) =>
      value < list[bestIndex] ? index : bestIndex,
    0,
  );
  const nextSizes = [...sizes];

  if (smallestIndex === 0) {
    nextSizes[1] = roundValue(nextSizes[0] + nextSizes[1]);
    nextSizes.splice(0, 1);
    return nextSizes;
  }

  nextSizes[smallestIndex - 1] = roundValue(
    nextSizes[smallestIndex - 1] + nextSizes[smallestIndex],
  );
  nextSizes.splice(smallestIndex, 1);
  return nextSizes;
}

function createPlannerState(templateId) {
  const suggestedSize = getDefaultHouseSize(templateId);
  const customLayout = normalizeCustomLayoutConfig({
    width: suggestedSize.width,
    depth: suggestedSize.depth,
    customColumns: DEFAULT_CUSTOM_COLUMN_COUNT,
    customRows: DEFAULT_CUSTOM_ROW_COUNT,
  });

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
    columnSizes: customLayout.columnSizes,
    rowSizes: customLayout.rowSizes,
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
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_INSET * 2) / (preview.footprint.width * widthScale),
    (PREVIEW_HEIGHT - PREVIEW_INSET * 2) / (preview.footprint.depth * depthScale),
  );
  const originX = PREVIEW_WIDTH / 2;
  const originY = PREVIEW_HEIGHT / 2;

  return (
    <div
      style={{
        width: '100%',
        height: `${PREVIEW_HEIGHT}px`,
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

function CustomTemplatePreview({
  preview,
  locale,
  onAdjustColumnDivider,
  onAdjustRowDivider,
}) {
  const dragRef = useRef(null);
  const [activeDrag, setActiveDrag] = useState(null);
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_INSET * 2) / preview.footprint.width,
    (PREVIEW_HEIGHT - PREVIEW_INSET * 2) / preview.footprint.depth,
  );
  const floorWidth = preview.footprint.width * scale;
  const floorDepth = preview.footprint.depth * scale;
  const startX = (PREVIEW_WIDTH - floorWidth) / 2;
  const startY = (PREVIEW_HEIGHT - floorDepth) / 2;
  const verticalLines = [];
  const horizontalLines = [];
  let xCursor = startX;
  let yCursor = startY;

  (preview.columnSizes ?? []).slice(0, -1).forEach((size) => {
    xCursor += size * scale;
    verticalLines.push(xCursor);
  });

  (preview.rowSizes ?? []).slice(0, -1).forEach((size) => {
    yCursor += size * scale;
    horizontalLines.push(yCursor);
  });

  useEffect(() => {
    if (!activeDrag) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const dragState = dragRef.current;

      if (!dragState) {
        return;
      }

      const deltaPixels =
        dragState.axis === 'column'
          ? event.clientX - dragState.clientX
          : event.clientY - dragState.clientY;
      const deltaValue = deltaPixels / dragState.scale;

      if (Math.abs(deltaValue) < 0.001) {
        return;
      }

      if (dragState.axis === 'column') {
        onAdjustColumnDivider(dragState.index, deltaValue);
      } else {
        onAdjustRowDivider(dragState.index, deltaValue);
      }

      dragState.clientX = event.clientX;
      dragState.clientY = event.clientY;
    };

    const handlePointerEnd = () => {
      dragRef.current = null;
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [activeDrag, onAdjustColumnDivider, onAdjustRowDivider]);

  const startDrag = (axis, index, event) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      axis,
      index,
      clientX: event.clientX,
      clientY: event.clientY,
      scale,
    };
    setActiveDrag({ axis, index });
  };

  return (
    <div
      style={{
        width: '100%',
        height: `${PREVIEW_HEIGHT}px`,
        borderRadius: '18px',
        background:
          'linear-gradient(180deg, rgba(31,41,55,0.95) 0%, rgba(17,24,39,0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
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
        const width = room.width * scale;
        const height = room.depth * scale;
        const left = startX + room.x * scale + floorWidth / 2 - width / 2;
        const top = startY + room.z * scale + floorDepth / 2 - height / 2;

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
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'linear-gradient(180deg, rgba(93,122,164,0.34) 0%, rgba(51,67,89,0.3) 100%)',
              color: '#f7fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 600,
              textAlign: 'center',
              padding: '6px',
            }}
          >
            {room.labelText}
          </div>
        );
      })}

      {verticalLines.map((left, index) => (
        <React.Fragment key={`column-${index}`}>
          <div
            style={{
              position: 'absolute',
              top: startY,
              left: left - 1,
              width: '2px',
              height: floorDepth,
              background:
                activeDrag?.axis === 'column' && activeDrag.index === index
                  ? '#7ccde4'
                  : 'rgba(124,205,228,0.72)',
              boxShadow: '0 0 0 1px rgba(124,205,228,0.15)',
            }}
          />
          <button
            onPointerDown={(event) => startDrag('column', index, event)}
            style={{
              position: 'absolute',
              top: startY + floorDepth / 2 - 14,
              left: left - 14,
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border: '1px solid rgba(124,205,228,0.85)',
              background:
                activeDrag?.axis === 'column' && activeDrag.index === index
                  ? '#244c5b'
                  : '#172733',
              color: '#d9f6ff',
              cursor: 'ew-resize',
            }}
          >
            ↔
          </button>
        </React.Fragment>
      ))}

      {horizontalLines.map((top, index) => (
        <React.Fragment key={`row-${index}`}>
          <div
            style={{
              position: 'absolute',
              left: startX,
              top: top - 1,
              height: '2px',
              width: floorWidth,
              background:
                activeDrag?.axis === 'row' && activeDrag.index === index
                  ? '#7ccde4'
                  : 'rgba(124,205,228,0.72)',
              boxShadow: '0 0 0 1px rgba(124,205,228,0.15)',
            }}
          />
          <button
            onPointerDown={(event) => startDrag('row', index, event)}
            style={{
              position: 'absolute',
              top: top - 14,
              left: startX + floorWidth / 2 - 14,
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border: '1px solid rgba(124,205,228,0.85)',
              background:
                activeDrag?.axis === 'row' && activeDrag.index === index
                  ? '#244c5b'
                  : '#172733',
              color: '#d9f6ff',
              cursor: 'ns-resize',
            }}
          >
            ↕
          </button>
        </React.Fragment>
      ))}

      <div
        style={{
          position: 'absolute',
          left: '14px',
          right: '14px',
          bottom: '12px',
          padding: '8px 10px',
          borderRadius: '12px',
          background: 'rgba(10,14,20,0.55)',
          color: '#b8c7db',
          fontSize: '0.72rem',
          lineHeight: 1.4,
        }}
      >
        {t('ui_drag_splits_hint', locale)}
      </div>
    </div>
  );
}

const RoomPlannerModal = ({ isOpen, unitSystem, onClose, onCreate }) => {
  const locale = getBrowserLocale();
  const [plannerState, setPlannerState] = useState(() =>
    createPlannerState(HOUSE_TEMPLATES[0].id),
  );
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  const isCustomTemplate = plannerState.templateId === CUSTOM_TEMPLATE_ID;
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

  if (!isOpen) {
    return null;
  }

  const updatePlanner = (patchOrUpdater) => {
    setPlannerState((current) => {
      const next =
        typeof patchOrUpdater === 'function'
          ? patchOrUpdater(current)
          : { ...current, ...patchOrUpdater };

      if (next.templateId !== CUSTOM_TEMPLATE_ID) {
        return next;
      }

      const normalized = normalizeCustomLayoutConfig(next);

      return {
        ...next,
        width: normalized.width,
        depth: normalized.depth,
        columnSizes: normalized.columnSizes,
        rowSizes: normalized.rowSizes,
      };
    });
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
    const clampedValue = Math.min(
      maximums[key] ?? nextValue,
      Math.max(minimums[key] ?? 0.1, nextValue),
    );

    if (isCustomTemplate && (key === 'width' || key === 'depth')) {
      updatePlanner((current) => ({
        ...current,
        [key]: clampedValue,
        columnSizes:
          key === 'width'
            ? scaleSegmentsToTotal(current.columnSizes, clampedValue)
            : current.columnSizes,
        rowSizes:
          key === 'depth'
            ? scaleSegmentsToTotal(current.rowSizes, clampedValue)
            : current.rowSizes,
      }));
      return;
    }

    updatePlanner({ [key]: clampedValue });
  };

  const applyTemplate = (templateId) => {
    const suggestedSize = getDefaultHouseSize(templateId);

    if (templateId === CUSTOM_TEMPLATE_ID) {
      const customLayout = normalizeCustomLayoutConfig({
        width: suggestedSize.width,
        depth: suggestedSize.depth,
        customColumns: DEFAULT_CUSTOM_COLUMN_COUNT,
        customRows: DEFAULT_CUSTOM_ROW_COUNT,
      });

      setPlannerState((current) => ({
        ...current,
        templateId,
        width: customLayout.width,
        depth: customLayout.depth,
        columnSizes: customLayout.columnSizes,
        rowSizes: customLayout.rowSizes,
      }));
      return;
    }

    setPlannerState((current) => ({
      ...current,
      templateId,
      width: suggestedSize.width,
      depth: suggestedSize.depth,
    }));
  };

  const updateCustomSizes = (axis, index, rawValue) => {
    const parsed = Math.max(0.2, fromDisplayValue(rawValue, unitSystem));

    updatePlanner((current) => {
      const currentSizes = axis === 'column' ? current.columnSizes : current.rowSizes;
      const nextSizes = [...currentSizes];
      nextSizes[index] = parsed;

      return axis === 'column'
        ? {
            ...current,
            width: sumValues(nextSizes),
            columnSizes: nextSizes,
          }
        : {
            ...current,
            depth: sumValues(nextSizes),
            rowSizes: nextSizes,
          };
    });
  };

  const adjustDivider = (axis, index, delta) => {
    updatePlanner((current) => {
      const currentSizes = axis === 'column' ? [...current.columnSizes] : [...current.rowSizes];
      const total = axis === 'column' ? current.width : current.depth;
      const dynamicMinimum = Math.max(
        0.45,
        Math.min(1.2, (total / currentSizes.length) * 0.42),
      );
      const maxForward = currentSizes[index + 1] - dynamicMinimum;
      const maxBackward = currentSizes[index] - dynamicMinimum;
      const safeDelta = Math.max(-maxBackward, Math.min(maxForward, delta));

      if (Math.abs(safeDelta) < 0.001) {
        return current;
      }

      currentSizes[index] = roundValue(currentSizes[index] + safeDelta);
      currentSizes[index + 1] = roundValue(currentSizes[index + 1] - safeDelta);

      return axis === 'column'
        ? {
            ...current,
            columnSizes: currentSizes,
          }
        : {
            ...current,
            rowSizes: currentSizes,
          };
    });
  };

  const addSection = (axis) => {
    updatePlanner((current) => {
      const nextSizes =
        axis === 'column'
          ? splitLargestSegment(current.columnSizes)
          : splitLargestSegment(current.rowSizes);

      return axis === 'column'
        ? {
            ...current,
            columnSizes: nextSizes,
          }
        : {
            ...current,
            rowSizes: nextSizes,
          };
    });
  };

  const removeSection = (axis) => {
    updatePlanner((current) => {
      const nextSizes =
        axis === 'column'
          ? mergeSmallestSegment(current.columnSizes)
          : mergeSmallestSegment(current.rowSizes);

      return axis === 'column'
        ? {
            ...current,
            columnSizes: nextSizes,
          }
        : {
            ...current,
            rowSizes: nextSizes,
          };
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

              {isCustomTemplate ? (
                <CustomTemplatePreview
                  preview={preview}
                  locale={locale}
                  onAdjustColumnDivider={(index, delta) =>
                    adjustDivider('column', index, delta)
                  }
                  onAdjustRowDivider={(index, delta) => adjustDivider('row', index, delta)}
                />
              ) : (
                <TemplatePreview
                  preview={preview}
                  widthScale={widthScale}
                  depthScale={depthScale}
                />
              )}

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
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ color: '#dce3ec', fontSize: '0.9rem', fontWeight: 600 }}>
                      {t('ui_adjust_plan', locale)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        onClick={() => addSection('column')}
                        disabled={plannerState.columnSizes.length >= MAX_CUSTOM_SECTIONS}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#1d2430',
                          color: '#fff',
                          padding: '0.55rem 0.8rem',
                          borderRadius: '10px',
                          opacity: plannerState.columnSizes.length >= MAX_CUSTOM_SECTIONS ? 0.45 : 1,
                        }}
                      >
                        {t('ui_add_column', locale)}
                      </button>
                      <button
                        onClick={() => removeSection('column')}
                        disabled={plannerState.columnSizes.length <= 1}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#1d2430',
                          color: '#fff',
                          padding: '0.55rem 0.8rem',
                          borderRadius: '10px',
                          opacity: plannerState.columnSizes.length <= 1 ? 0.45 : 1,
                        }}
                      >
                        {t('ui_remove_column', locale)}
                      </button>
                      <button
                        onClick={() => addSection('row')}
                        disabled={plannerState.rowSizes.length >= MAX_CUSTOM_SECTIONS}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#1d2430',
                          color: '#fff',
                          padding: '0.55rem 0.8rem',
                          borderRadius: '10px',
                          opacity: plannerState.rowSizes.length >= MAX_CUSTOM_SECTIONS ? 0.45 : 1,
                        }}
                      >
                        {t('ui_add_row', locale)}
                      </button>
                      <button
                        onClick={() => removeSection('row')}
                        disabled={plannerState.rowSizes.length <= 1}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#1d2430',
                          color: '#fff',
                          padding: '0.55rem 0.8rem',
                          borderRadius: '10px',
                          opacity: plannerState.rowSizes.length <= 1 ? 0.45 : 1,
                        }}
                      >
                        {t('ui_remove_row', locale)}
                      </button>
                    </div>
                  </div>

                  <div style={{ color: '#8fa0b8', fontSize: '0.78rem', lineHeight: 1.45 }}>
                    {t('ui_drag_splits_hint', locale)}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {plannerState.columnSizes.map((size, index) => (
                      <label
                        key={`column-size-${index}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          color: '#aab5c4',
                          fontSize: '0.82rem',
                        }}
                      >
                        {t('ui_column_prefix', locale)} {index + 1} ({t('ui_width', locale)})
                        <input
                          type="number"
                          min="0"
                          step={unit.step}
                          value={toDisplayValue(size, unitSystem)}
                          onChange={(event) =>
                            updateCustomSizes('column', index, event.target.value)
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
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {plannerState.rowSizes.map((size, index) => (
                      <label
                        key={`row-size-${index}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          color: '#aab5c4',
                          fontSize: '0.82rem',
                        }}
                      >
                        {t('ui_row_prefix', locale)} {index + 1} ({t('ui_depth', locale)})
                        <input
                          type="number"
                          min="0"
                          step={unit.step}
                          value={toDisplayValue(size, unitSystem)}
                          onChange={(event) =>
                            updateCustomSizes('row', index, event.target.value)
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
                    ))}
                  </div>
                </div>
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
