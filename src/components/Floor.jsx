import React from 'react';
import useStore from '../store/useStore';

const Floor = () => {
    const selectObject = useStore((state) => state.selectObject);

    return (
        <group>
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.01, 0]}
                receiveShadow
                onClick={(e) => {
                    e.stopPropagation();
                    selectObject(null);
                }}
            >
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#232832" />
            </mesh>
            <gridHelper args={[40, 40, 0x4d5a70, 0x2f3948]} />
        </group>
    );
};

export default Floor;
