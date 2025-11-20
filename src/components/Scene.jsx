import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, SoftShadows } from '@react-three/drei';
import Floor from './Floor';
import Furniture from './Furniture';
import useStore from '../store/useStore';

const Scene = () => {
    const objects = useStore((state) => state.objects);
    const selectObject = useStore((state) => state.selectObject);
    const selectedId = useStore((state) => state.selectedId);

    return (
        <Canvas
            shadows
            camera={{ position: [5, 5, 5], fov: 50 }}
            style={{ background: '#1a1a1a', width: '100%', height: '100%' }}
            onPointerMissed={() => selectObject(null)}
        >
            <SoftShadows />
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />

            <Floor />

            {objects.map((obj) => (
                <Furniture
                    key={obj.id}
                    id={obj.id}
                    type={obj.type}
                    color={obj.color}
                    position={obj.position}
                    rotation={obj.rotation}
                    scale={obj.scale}
                    isSelected={obj.id === selectedId}
                    onClick={(e) => {
                        e.stopPropagation();
                        selectObject(obj.id);
                    }}
                />
            ))}

            <OrbitControls makeDefault />
        </Canvas>
    );
};

export default Scene;
