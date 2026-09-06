import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
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
    const setCameraState = useStore((state) => state.setCameraState);
    const isObjectTransforming = useStore((state) => state.isObjectTransforming);
    const toggleObjectOpen = useStore((state) => state.toggleObjectOpen);
    const controlsRef = React.useRef(null);
    const mouseButtons =
        cameraMode === 'pan'
            ? { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
            : { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    const touchControls =
        cameraMode === 'pan'
            ? { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }
            : { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    const syncCameraState = () => {
        const controls = controlsRef.current;

        if (!controls) {
            return;
        }

        setCameraState({
            position: controls.object.position.toArray(),
            target: controls.target.toArray(),
        });
    };

    React.useEffect(() => {
        const controls = controlsRef.current;

        if (!controls) {
            return undefined;
        }

        setCameraState({
            position: controls.object.position.toArray(),
            target: controls.target.toArray(),
        });

        return undefined;
    }, [setCameraState]);

    return (
        <Canvas
            frameloop="demand"
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
            <color attach="background" args={['#e4e1d8']} />
            <ambientLight intensity={0.7} />
            <directionalLight
                position={[8, 10, 4]}
                intensity={2.1}
                color="#fff4e4"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0002}
                shadow-camera-left={-14}
                shadow-camera-right={14}
                shadow-camera-top={14}
                shadow-camera-bottom={-14}
            />
            <directionalLight position={[-9, 7, -7]} intensity={0.7} color="#e2eaff" />

            <Environment resolution={256} frames={1}>
                <Lightformer
                    form="rect"
                    color="#fff2df"
                    intensity={1.4}
                    scale={[8, 8, 1]}
                    position={[8, 5, 2]}
                    rotation={[0, -Math.PI / 2, 0]}
                />
                <Lightformer
                    form="rect"
                    color="#eef2ff"
                    intensity={0.7}
                    scale={[10, 10, 1]}
                    position={[0, 8, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                />
                <Lightformer
                    form="rect"
                    color="#c9a87c"
                    intensity={0.3}
                    scale={[10, 10, 1]}
                    position={[0, -2, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                />
            </Environment>

            <Floor />

            <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={34} blur={2.2} far={5} resolution={512} />

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
                ref={controlsRef}
                makeDefault
                enabled={!isObjectTransforming}
                enableDamping
                mouseButtons={mouseButtons}
                touches={touchControls}
                minDistance={4}
                maxDistance={32}
                maxPolarAngle={Math.PI / 2.03}
                onChange={syncCameraState}
            />
        </Canvas>
    );
};

export default Scene;
