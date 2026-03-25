import React, { useMemo, useState } from 'react';
import {
  UNIT_SYSTEMS,
  fromDisplayValue,
  toDisplayValue,
} from '../lib/objectCatalog';
import { getBrowserLocale, t } from '../lib/i18n';
import {
  createDefaultTileGrid,
  createEvenSegments,
  CUSTOM_TEMPLATE_ID,
  DEFAULT_CUSTOM_COLUMN_COUNT,
  DEFAULT_CUSTOM_ROW_COUNT,
  getCustomTemplatePreview,
  getDefaultHouseSize,
  getHouseTemplate,
  getRoomTileLabel,
  getTemplateDescription,
  getTemplateLabel,
  getTemplateRooms,
  HOUSE_TEMPLATES,
  MAX_CUSTOM_SECTIONS,
  normalizeCustomLayoutConfig,
  ROOM_TILE_TYPES,
} from '../lib/roomBuilder';

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 220;
const PREVIEW_INSET = 16;

function createPlannerState(templateId) {
  const suggestedSize = getDefaultHouseSize(templateId);
  const customLayout = normalizeCustomLayoutConfig({
    width: suggestedSize.width,
    depth: suggestedSize.depth,
    customColumns: DEFAULT_CUSTOM_COLUMN_COUNT,
    customRows: DEFAULT_CUSTOM_ROW_COUNT,
    tileGrid: createDefaultTileGrid(
      DEFAULT_CUSTOM_COLUMN_COUNT,
      DEFAULT_CUSTOM_ROW_COUNT,
    ),
  });

  return {
    templateId,
    width: suggestedSize.width,
    depth: suggestedSize.depth,
    wallHeight: 2.5,
    wallThickness: 0.08,
    includeFloor: true,
    includeCeiling: false,
    includeDoors: true,
    includeOuterWalls: false,
    replaceExisting: true,
    columnSizes: customLayout.columnSizes,
    rowSizes: customLayout.rowSizes,
    tileGrid: customLayout.tileGrid,
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

function TilePlannerPreview({ preview, selectedTileType, onPaintTile, locale }) {
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_INSET * 2) / preview.footprint.width,
    (PREVIEW_HEIGHT - PREVIEW_INSET * 2) / preview.footprint.depth,
  );
  const floorWidth = preview.footprint.width * scale;
  const floorDepth = preview.footprint.depth * scale;
  const startX = (PREVIEW_WIDTH - floorWidth) / 2;
  const startY = (PREVIEW_HEIGHT - floorDepth) / 2;

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

      {preview.tiles.map((tile) => {
        const width = tile.width * scale;
        const height = tile.depth * scale;
        const left = startX + tile.x * scale + floorWidth / 2 - width / 2;
        const top = startY + tile.z * scale + floorDepth / 2 - height / 2;
        const isEmpty = tile.type === 'empty';

        return (
          <button
            key={tile.id}
            onClick={() => onPaintTile(tile.row, tile.column)}
            title={`${getRoomTileLabel(selectedTileType, locale)} -> ${tile.labelText}`}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              borderRadius: '12px',
              border: isEmpty
                ? '1px dashed rgba(255,255,255,0.14)'
                : '1px solid rgba(255,255,255,0.14)',
              background: isEmpty
                ? 'rgba(255,255,255,0.035)'
                : `${tile.accent}dd`,
              color: isEmpty ? '#8896a9' : '#f7fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 600,
              textAlign: 'center',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            {tile.labelText}
          </button>
        );
      })}

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
  const [selectedTileType, setSelectedTileType] = useState('living');
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
  const filledTileCount = isCustomTemplate
    ? preview.tiles.filter((tile) => tile.type !== 'empty').length
    : preview.rooms.length;

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
        tileGrid: normalized.tileGrid,
      };
    });
  };

  const updateMeasuredValue = (key, rawValue) => {
    const nextValue = fromDisplayValue(rawValue, unitSystem);
    const minimums = {
      width: isCustomTemplate ? 4.5 : Math.max(3.5, selectedTemplate.footprint.width * 0.5),
      depth: isCustomTemplate ? 4.5 : Math.max(3.5, selectedTemplate.footprint.depth * 0.5),
      wallHeight: 2.1,
      wallThickness: 0.05,
    };
    const maximums = {
      width: isCustomTemplate ? 24 : Math.min(24, selectedTemplate.footprint.width * 2.8),
      depth: isCustomTemplate ? 24 : Math.min(24, selectedTemplate.footprint.depth * 2.8),
      wallHeight: 4.2,
      wallThickness: 0.25,
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
            ? createEvenSegments(clampedValue, current.columnSizes.length)
            : current.columnSizes,
        rowSizes:
          key === 'depth'
            ? createEvenSegments(clampedValue, current.rowSizes.length)
            : current.rowSizes,
      }));
      return;
    }

    updatePlanner({ [key]: clampedValue });
  };

  const applyTemplate = (templateId) => {
    const suggestedSize = getDefaultHouseSize(templateId);

    if (templateId === CUSTOM_TEMPLATE_ID) {
      const columns = DEFAULT_CUSTOM_COLUMN_COUNT;
      const rows = DEFAULT_CUSTOM_ROW_COUNT;
      const customLayout = normalizeCustomLayoutConfig({
        width: suggestedSize.width,
        depth: suggestedSize.depth,
        columnSizes: createEvenSegments(suggestedSize.width, columns),
        rowSizes: createEvenSegments(suggestedSize.depth, rows),
        tileGrid: createDefaultTileGrid(columns, rows),
      });

      setPlannerState((current) => ({
        ...current,
        templateId,
        width: customLayout.width,
        depth: customLayout.depth,
        columnSizes: customLayout.columnSizes,
        rowSizes: customLayout.rowSizes,
        tileGrid: customLayout.tileGrid,
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

  const paintTile = (rowIndex, columnIndex) => {
    updatePlanner((current) => {
      const nextTileGrid = current.tileGrid.map((row) => [...row]);
      nextTileGrid[rowIndex][columnIndex] = selectedTileType;
      return {
        ...current,
        tileGrid: nextTileGrid,
      };
    });
  };

  const addColumn = () => {
    updatePlanner((current) => {
      const nextCount = Math.min(MAX_CUSTOM_SECTIONS, current.columnSizes.length + 1);
      return {
        ...current,
        columnSizes: createEvenSegments(current.width, nextCount),
        tileGrid: current.tileGrid.map((row) => [...row, 'empty'].slice(0, nextCount)),
      };
    });
  };

  const removeColumn = () => {
    updatePlanner((current) => {
      const nextCount = Math.max(1, current.columnSizes.length - 1);
      return {
        ...current,
        columnSizes: createEvenSegments(current.width, nextCount),
        tileGrid: current.tileGrid.map((row) => row.slice(0, nextCount)),
      };
    });
  };

  const addRow = () => {
    updatePlanner((current) => {
      const nextCount = Math.min(MAX_CUSTOM_SECTIONS, current.rowSizes.length + 1);
      const nextRow = Array.from({ length: current.columnSizes.length }, () => 'empty');
      return {
        ...current,
        rowSizes: createEvenSegments(current.depth, nextCount),
        tileGrid: [...current.tileGrid, nextRow].slice(0, nextCount),
      };
    });
  };

  const removeRow = () => {
    updatePlanner((current) => {
      const nextCount = Math.max(1, current.rowSizes.length - 1);
      return {
        ...current,
        rowSizes: createEvenSegments(current.depth, nextCount),
        tileGrid: current.tileGrid.slice(0, nextCount),
      };
    });
  };

  const resetTiles = () => {
    updatePlanner((current) => ({
      ...current,
      tileGrid: createDefaultTileGrid(
        current.columnSizes.length,
        current.rowSizes.length,
      ),
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
          width: 'min(1080px, 100%)',
          maxHeight: 'min(820px, calc(100vh - 48px))',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
                    ? getTemplateLabel(selectedTemplate, locale)
                    : getTemplateLabel(selectedTemplate, locale)}
                </div>
                <div style={{ marginTop: '6px', color: '#8fa0b8', fontSize: '0.84rem' }}>
                  {isCustomTemplate
                    ? getTemplateDescription(selectedTemplate, locale)
                    : getTemplateDescription(selectedTemplate, locale)}
                </div>
              </div>

              {isCustomTemplate ? (
                <TilePlannerPreview
                  preview={preview}
                  selectedTileType={selectedTileType}
                  onPaintTile={paintTile}
                  locale={locale}
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
                  {t('ui_filled_tiles', locale)} {filledTileCount}
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
                      gap: '8px',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ color: '#dce3ec', fontSize: '0.9rem', fontWeight: 600 }}>
                      {t('ui_room_palette', locale)}
                    </div>
                    <button
                      onClick={resetTiles}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: '#1d2430',
                        color: '#fff',
                        padding: '0.55rem 0.8rem',
                        borderRadius: '10px',
                      }}
                    >
                      {t('ui_reset_tiles', locale)}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {ROOM_TILE_TYPES.map((tileType) => (
                      <button
                        key={tileType.id}
                        onClick={() => setSelectedTileType(tileType.id)}
                        style={{
                          border:
                            selectedTileType === tileType.id
                              ? '1px solid rgba(79,140,255,0.8)'
                              : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          background:
                            selectedTileType === tileType.id ? '#1d2f4a' : '#1b2230',
                          color: '#fff',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '999px',
                            background: tileType.accent,
                            border: '1px solid rgba(255,255,255,0.16)',
                            flexShrink: 0,
                          }}
                        />
                        <span>{getRoomTileLabel(tileType.id, locale)}</span>
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <button
                      onClick={addColumn}
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
                      onClick={removeColumn}
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
                      onClick={addRow}
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
                      onClick={removeRow}
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#8fa0b8',
                        fontSize: '0.8rem',
                        paddingLeft: '6px',
                      }}
                    >
                      {t('ui_columns', locale)} {plannerState.columnSizes.length} / {t('ui_rows', locale)} {plannerState.rowSizes.length}
                    </div>
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
