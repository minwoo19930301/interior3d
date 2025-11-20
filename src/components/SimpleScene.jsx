import React from 'react';
import { Canvas } from '@react-three/fiber';

const SimpleScene = () => {
    return (
        <div style={{ width: '100%', height: '500px', background: 'blue' }}>
            <Canvas camera={{ position: [0, 0, 5] }}>
                <ambientLight />
                <mesh>
                    <boxGeometry />
                    <meshBasicMaterial color="red" />
                </mesh>
            </Canvas>
        </div>
    );
};

export default SimpleScene;
