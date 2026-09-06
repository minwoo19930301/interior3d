import React from 'react';
import * as THREE from 'three';
import useStore from '../store/useStore';
import { getGroundTexture, getGridOverlayTexture } from '../lib/textures';

const FLOOR_SIZE = 40;

const Floor = () => {
    const selectObject = useStore((state) => state.selectObject);

    const groundTexture = React.useMemo(() => {
        const texture = getGroundTexture().clone();
        texture.needsUpdate = true;
        texture.repeat.set(FLOOR_SIZE / 3.2, FLOOR_SIZE / 3.2);
        return texture;
    }, []);

    const gridTexture = React.useMemo(() => {
        const texture = getGridOverlayTexture().clone();
        texture.needsUpdate = true;
        texture.repeat.set(FLOOR_SIZE, FLOOR_SIZE);
        return texture;
    }, []);

    return (
        <group>
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.03, 0]}
                receiveShadow
                onClick={(e) => {
                    e.stopPropagation();
                    selectObject(null);
                }}
            >
                <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                <meshStandardMaterial map={groundTexture} roughness={0.92} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.029, 0]}>
                <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                <meshBasicMaterial
                    map={gridTexture}
                    transparent
                    opacity={0.22}
                    depthWrite={false}
                    blending={THREE.NormalBlending}
                />
            </mesh>
        </group>
    );
};

export default Floor;
