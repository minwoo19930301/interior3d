import React from 'react';
import useStore from '../store/useStore';
import {
  OBJECT_CATALOG,
  OBJECT_GROUPS,
  toDisplayValue,
} from '../lib/objectCatalog';

const Sidebar = ({ onOpenRoomPlanner, isMobile = false, onClose }) => {
  const addObject = useStore((state) => state.addObject);
  const unitSystem = useStore((state) => state.unitSystem);

  return (
    <div
      style={{
        width: isMobile ? 'min(340px, calc(100vw - 32px))' : '290px',
        height: isMobile ? '100%' : 'auto',
        maxHeight: isMobile ? 'calc(100vh - 24px)' : 'none',
        background: 'rgba(13,17,23,0.96)',
        color: '#fff',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
        border: isMobile ? '1px solid rgba(255,255,255,0.08)' : undefined,
        borderRadius: isMobile ? '22px' : undefined,
        boxShadow: isMobile ? '0 24px 60px rgba(0,0,0,0.35)' : 'none',
        overflowY: 'auto',
      }}
    >
      {isMobile ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Structure</h2>
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
            Close
          </button>
        </div>
      ) : null}

      {OBJECT_GROUPS.map((group) => {
        const items = OBJECT_CATALOG.filter((item) => item.group === group.id);

        return (
          <section key={group.id}>
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#7f8da3',
              }}
            >
              {group.label}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    item.planner ? onOpenRoomPlanner() : addObject(item.id)
                  }
                  style={{
                    background: 'linear-gradient(180deg, #1b2430 0%, #151c25 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '12px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#90a0b5',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.planner
                      ? 'Preset layouts'
                      : `${toDisplayValue(item.dimensions[0], unitSystem)} x ${toDisplayValue(item.dimensions[1], unitSystem)} x ${toDisplayValue(item.dimensions[2], unitSystem)} ${unitSystem}`}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Sidebar;
