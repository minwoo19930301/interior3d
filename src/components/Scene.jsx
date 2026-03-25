import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MOUSE, TOUCH } from 'three';
import Floor from './Floor';
import Furniture from './Furniture';
import useStore from '../store/useStore';
import { isObjectOpenable } from '../lib/objectCatalog';

const Scene = () => {
    const objects = useStore((state) => state.objects);
    const selectObject = useStore((state) => state.selectObject);
    const selectedId = useStore((state) => state.selectedId);
    const transformMode = useStore((state) => state.transformMode);
    const cameraMode = useStore((state) => state.cameraMode);
    const toggleObjectOpen = useStore((state) => state.toggleObjectOpen);
    const mouseButtons =
        cameraMode === 'pan'
            ? { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
            : { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    const touchControls =
        cameraMode === 'pan'
            ? { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }
            : { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

    return (
        <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [9, 7.5, 9], fov: 44 }}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            onCreated={({ gl }) => {
                gl.domElement.style.touchAction = 'none';
                gl.domElement.style.webkitTapHighlightColor = 'transparent';
            }}
            onPointerMissed={() => selectObject(null)}
            onDoubleClick={(event) => event.preventDefault()}
        >
            <color attach="background" args={['#11151d']} />
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, 12, 8]}
                intensity={1.1}
                castShadow
                shadow-mapSize={[1024, 1024]}
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
                    isOpen={obj.isOpen}
                    swing={obj.swing}
                    onClick={(e) => {
                        e.stopPropagation();
                        selectObject(obj.id);
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault?.();
                        selectObject(obj.id);

                        if (isObjectOpenable(obj.type)) {
                            toggleObjectOpen(obj.id);
                        }
                    }}
                />
            ))}

            <OrbitControls
                makeDefault
                enableDamping
                mouseButtons={mouseButtons}
                touches={touchControls}
                minDistance={4}
                maxDistance={32}
                maxPolarAngle={Math.PI / 2.03}
            />
        </Canvas>
    );
};

export default Scene;
