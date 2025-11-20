import React, { useRef } from 'react';
import useStore from '../store/useStore';

const Grid2D = () => {
    const objects = useStore((state) => state.objects);
    const selectObject = useStore((state) => state.selectObject);
    const updateObject = useStore((state) => state.updateObject);
    const selectedId = useStore((state) => state.selectedId);

    const containerRef = useRef(null);
    const dragItem = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e, id, x, y) => {
        e.stopPropagation();
        selectObject(id);
        dragItem.current = id;
        dragOffset.current = { x: e.clientX - x, y: e.clientY - y };
    };

    const handleMouseMove = (e) => {
        if (dragItem.current) {
            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;
            updateObject(dragItem.current, { x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        dragItem.current = null;
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                background: '#e0e0e0',
                position: 'relative',
                overflow: 'hidden',
                backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
                backgroundSize: '50px 50px'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={() => selectObject(null)}
        >
            {objects.map((obj) => (
                <div
                    key={obj.id}
                    onMouseDown={(e) => handleMouseDown(e, obj.id, obj.x, obj.y)}
                    style={{
                        position: 'absolute',
                        left: obj.x,
                        top: obj.y,
                        width: obj.width,
                        height: obj.height,
                        backgroundColor: obj.color,
                        border: obj.id === selectedId ? '3px solid hotpink' : '1px solid #999',
                        cursor: 'move',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `rotate(${obj.rotation}deg)`,
                        userSelect: 'none'
                    }}
                >
                    {obj.type}
                </div>
            ))}
        </div>
    );
};

export default Grid2D;
