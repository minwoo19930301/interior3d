import React from 'react';
import useStore from '../store/useStore';

const PropertiesPanel = () => {
    const selectedId = useStore((state) => state.selectedId);
    const objects = useStore((state) => state.objects);
    const updateObject = useStore((state) => state.updateObject);
    const removeObject = useStore((state) => state.removeObject);

    const selectedObject = objects.find((obj) => obj.id === selectedId);

    if (!selectedObject) {
        return (
            <div style={{
                width: '250px',
                background: '#2a2a2a',
                color: '#888',
                padding: '20px',
                borderLeft: '1px solid #444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
            }}>
                Select an object to view properties
            </div>
        );
    }

    const handleChange = (key, value, index = null) => {
        if (index !== null) {
            const newArray = [...selectedObject[key]];
            newArray[index] = parseFloat(value);
            updateObject(selectedId, { [key]: newArray });
        } else {
            updateObject(selectedId, { [key]: value });
        }
    };

    return (
        <div style={{
            width: '250px',
            background: '#2a2a2a',
            color: '#fff',
            padding: '20px',
            borderLeft: '1px solid #444',
            overflowY: 'auto'
        }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Properties</h2>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '12px' }}>Type</label>
                <div style={{ padding: '8px', background: '#333', borderRadius: '4px', textTransform: 'capitalize' }}>
                    {selectedObject.type}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '12px' }}>Position</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                    {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis}>
                            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#666' }}>{axis}</label>
                            <input
                                type="number"
                                step="0.1"
                                value={selectedObject.position[i]}
                                onChange={(e) => handleChange('position', e.target.value, i)}
                                style={{ width: '100%', background: '#333', border: 'none', color: '#fff', padding: '5px', borderRadius: '4px' }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '12px' }}>Rotation</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                    {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis}>
                            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#666' }}>{axis}</label>
                            <input
                                type="number"
                                step="0.1"
                                value={selectedObject.rotation[i]}
                                onChange={(e) => handleChange('rotation', e.target.value, i)}
                                style={{ width: '100%', background: '#333', border: 'none', color: '#fff', padding: '5px', borderRadius: '4px' }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '12px' }}>Scale</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                    {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis}>
                            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#666' }}>{axis}</label>
                            <input
                                type="number"
                                step="0.1"
                                value={selectedObject.scale[i]}
                                onChange={(e) => handleChange('scale', e.target.value, i)}
                                style={{ width: '100%', background: '#333', border: 'none', color: '#fff', padding: '5px', borderRadius: '4px' }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '12px' }}>Color</label>
                <input
                    type="color"
                    value={selectedObject.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
            </div>

            <button
                onClick={() => removeObject(selectedId)}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '20px'
                }}
            >
                Delete Object
            </button>
        </div>
    );
};

export default PropertiesPanel;
