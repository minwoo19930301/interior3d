import React from 'react';
import useStore from '../store/useStore';
import {
  UNIT_SYSTEMS,
  degreesToRadians,
  fromDisplayValue,
  getObjectLabel,
  isObjectOpenable,
  radiansToDegrees,
  toDisplayValue,
} from '../lib/objectCatalog';
import { getBrowserLocale, t } from '../lib/i18n';

const PropertiesPanel = ({ isMobile = false, onClose }) => {
  const locale = getBrowserLocale();
  const selectedId = useStore((state) => state.selectedId);
  const objects = useStore((state) => state.objects);
  const updateObject = useStore((state) => state.updateObject);
  const removeObject = useStore((state) => state.removeObject);
  const toggleObjectOpen = useStore((state) => state.toggleObjectOpen);
  const unitSystem = useStore((state) => state.unitSystem);

  const selectedObject = objects.find((obj) => obj.id === selectedId);
  const unit = UNIT_SYSTEMS[unitSystem] ?? UNIT_SYSTEMS.m;
  const containerStyle = {
    width: isMobile ? '100%' : '300px',
    background: 'rgba(13,17,23,0.96)',
    color: '#fff',
    padding: '22px',
    borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
    border: isMobile ? '1px solid rgba(255,255,255,0.08)' : undefined,
    borderRadius: isMobile ? '22px' : undefined,
    boxShadow: isMobile ? '0 24px 60px rgba(0,0,0,0.35)' : 'none',
    overflowY: 'auto',
  };

  const header = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '10px',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{t('ui_properties_panel', locale)}</h2>
      {isMobile ? (
        <button
          onClick={onClose}
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '999px',
            background: '#1a212c',
            color: '#fff',
            padding: '0.4rem 0.8rem',
          }}
        >
          {t('ui_close', locale)}
        </button>
      ) : null}
    </div>
  );

  if (!selectedObject) {
    return (
      <div
        style={{
          ...containerStyle,
          display: 'flex',
          flexDirection: 'column',
          minHeight: isMobile ? '220px' : '100%',
        }}
      >
        {header}
        <div
          style={{
            flex: 1,
            color: '#8d9bb0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          {t('ui_select_object_hint', locale)}
        </div>
      </div>
    );
  }

  const handleVectorChange = (key, value, index, parser = Number) => {
    const parsed = parser(value);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const nextVector = [...selectedObject[key]];
    nextVector[index] = parsed;
    updateObject(selectedId, { [key]: nextVector });
  };

  const handleChange = (key, value) => {
    updateObject(selectedId, { [key]: value });
  };

  const rotateAroundYAxis = (deltaDegrees) => {
    const nextRotation = [...selectedObject.rotation];
    nextRotation[1] = degreesToRadians(
      radiansToDegrees(selectedObject.rotation[1]) + deltaDegrees,
    );
    updateObject(selectedId, { rotation: nextRotation });
  };

  return (
    <div style={containerStyle}>
      {header}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '12px' }}>
          {t('ui_type', locale)}
        </label>
        <div style={{ padding: '10px', background: '#1a212c', borderRadius: '8px' }}>
          {getObjectLabel(selectedObject.type, locale)}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '12px' }}>
          {t('ui_position', locale)} ({unit.label})
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis}>
              <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#666' }}>
                {axis}
              </label>
              <input
                type="number"
                step={unit.step}
                value={toDisplayValue(selectedObject.position[i], unitSystem)}
                onChange={(e) =>
                  handleVectorChange(
                    'position',
                    e.target.value,
                    i,
                    (rawValue) => fromDisplayValue(rawValue, unitSystem),
                  )
                }
                style={{ width: '100%', background: '#1a212c', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '12px' }}>
          {t('ui_rotation', locale)}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis}>
              <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#666' }}>
                {axis}
              </label>
              <input
                type="number"
                step="5"
                value={radiansToDegrees(selectedObject.rotation[i])}
                onChange={(e) =>
                  handleVectorChange(
                    'rotation',
                    e.target.value,
                    i,
                    degreesToRadians,
                  )
                }
                style={{ width: '100%', background: '#1a212c', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px' }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
          <button
            onClick={() => rotateAroundYAxis(-90)}
            style={{ background: '#1a212c', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {t('ui_y_minus_90', locale)}
          </button>
          <button
            onClick={() => rotateAroundYAxis(90)}
            style={{ background: '#1a212c', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {t('ui_y_plus_90', locale)}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '12px' }}>
          {t('ui_size', locale)} ({unit.label})
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
          {['W', 'H', 'D'].map((axis, i) => (
            <div key={axis}>
              <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#666' }}>
                {axis}
              </label>
              <input
                type="number"
                step={unit.step}
                value={toDisplayValue(selectedObject.dimensions[i], unitSystem)}
                onChange={(e) =>
                  handleVectorChange(
                    'dimensions',
                    e.target.value,
                    i,
                    (rawValue) => fromDisplayValue(rawValue, unitSystem),
                  )
                }
                style={{ width: '100%', background: '#1a212c', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '12px' }}>
          {t('ui_color', locale)}
        </label>
        <input
          type="color"
          value={selectedObject.color}
          onChange={(e) => handleChange('color', e.target.value)}
          style={{ width: '100%', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#1a212c' }}
        />
      </div>

      {isObjectOpenable(selectedObject.type) ? (
        <button
          onClick={() => toggleObjectOpen(selectedId)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1a212c',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {selectedObject.isOpen ? t('ui_close', locale) : t('ui_open', locale)}
        </button>
      ) : null}

      {selectedObject.type === 'door' ? (
        <button
          onClick={() =>
            updateObject(selectedId, {
              swing: selectedObject.swing === 'right' ? 'left' : 'right',
            })
          }
          style={{
            width: '100%',
            padding: '12px',
            background: '#1a212c',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '12px',
          }}
        >
          {t('ui_flip_swing', locale)}
        </button>
      ) : null}

      <button
        onClick={() => removeObject(selectedId)}
        style={{
          width: '100%',
          padding: '12px',
          background: '#a93e3e',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '20px',
        }}
      >
        {t('ui_delete_object', locale)}
      </button>
    </div>
  );
};

export default PropertiesPanel;
