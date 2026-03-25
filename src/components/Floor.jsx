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
                <meshStandardMaterial color="#ddd8d0" />
            </mesh>
            <gridHelper args={[40, 40, 0xb0a79a, 0xcac2b5]} />
        </group>
    );
};

export default Floor;
