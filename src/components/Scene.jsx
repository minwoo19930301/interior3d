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
    const transformMode = useStore((state) => state.transformMode);

    return (
        <Canvas
            shadows
            camera={{ position: [9, 7.5, 9], fov: 44 }}
            style={{ width: '100%', height: '100%' }}
            onPointerMissed={() => selectObject(null)}
        >
            <color attach="background" args={['#11151d']} />
            <SoftShadows />
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, 12, 8]}
                intensity={1.1}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <directionalLight position={[-8, 10, -6]} intensity={0.25} />

            <Floor />

            {objects.map((obj) => (
                <Furniture
                    key={obj.id}
                    id={obj.id}
                    type={obj.type}
                    color={obj.color}
                    position={obj.position}
                    rotation={obj.rotation}
                    dimensions={obj.dimensions}
                    transformMode={transformMode}
                    isSelected={obj.id === selectedId}
                    onClick={(e) => {
                        e.stopPropagation();
                        selectObject(obj.id);
                    }}
                />
            ))}

            <OrbitControls
                makeDefault
                enableDamping
                minDistance={4}
                maxDistance={32}
                maxPolarAngle={Math.PI / 2.03}
            />
        </Canvas>
    );
};

export default Scene;
