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
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            <gridHelper args={[20, 20, 0x666666, 0x444444]} />
        </group>
    );
};

export default Floor;
