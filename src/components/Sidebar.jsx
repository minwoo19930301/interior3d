import React from 'react';
import useStore from '../store/useStore';

const FURNITURE_ITEMS = [
    { id: 'cube', label: 'Cube', icon: '📦' },
    { id: 'table', label: 'Table', icon: '🪑' },
    { id: 'chair', label: 'Chair', icon: '💺' },
    { id: 'bed', label: 'Bed', icon: '🛏️' },
    { id: 'sofa', label: 'Sofa', icon: '🛋️' },
    { id: 'cabinet', label: 'Cabinet', icon: '🗄️' },
];

const Sidebar = () => {
    const addObject = useStore((state) => state.addObject);

    return (
        <div style={{
            width: '250px',
            background: '#2a2a2a',
            color: '#fff',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            borderRight: '1px solid #444',
            overflowY: 'auto'
        }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Furniture</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {FURNITURE_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => addObject(item.id)}
                        style={{
                            background: '#3a3a3a',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            padding: '15px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#4a4a4a'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#3a3a3a'}
                    >
                        <span style={{ fontSize: '24px' }}>{item.icon}</span>
                        <span style={{ fontSize: '14px' }}>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
