import React, { forwardRef } from 'react';
import { TransformControls } from '@react-three/drei';
import useStore from '../store/useStore';

const Furniture = forwardRef(({ type, color, isSelected, id, ...props }, ref) => {
    const updateObject = useStore((state) => state.updateObject);

    const materialProps = {
        color: isSelected ? '#ff4081' : color, // Highlight color
    };

    const renderContent = () => {
        if (type === 'table') {
            return (
                <group>
                    {/* Table Top */}
                    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.5, 0.1, 1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Legs */}
                    <mesh position={[-0.6, 0.2, -0.4]} castShadow receiveShadow>
                        <boxGeometry args={[0.1, 0.4, 0.1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[0.6, 0.2, -0.4]} castShadow receiveShadow>
                        <boxGeometry args={[0.1, 0.4, 0.1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[-0.6, 0.2, 0.4]} castShadow receiveShadow>
                        <boxGeometry args={[0.1, 0.4, 0.1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[0.6, 0.2, 0.4]} castShadow receiveShadow>
                        <boxGeometry args={[0.1, 0.4, 0.1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                </group>
            );
        }

        if (type === 'chair') {
            return (
                <group>
                    {/* Seat */}
                    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.5, 0.05, 0.5]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Backrest */}
                    <mesh position={[0, 0.5, -0.225]} castShadow receiveShadow>
                        <boxGeometry args={[0.5, 0.5, 0.05]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Legs */}
                    <mesh position={[-0.2, 0.125, -0.2]} castShadow receiveShadow>
                        <boxGeometry args={[0.05, 0.25, 0.05]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[0.2, 0.125, -0.2]} castShadow receiveShadow>
                        <boxGeometry args={[0.05, 0.25, 0.05]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[-0.2, 0.125, 0.2]} castShadow receiveShadow>
                        <boxGeometry args={[0.05, 0.25, 0.05]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[0.2, 0.125, 0.2]} castShadow receiveShadow>
                        <boxGeometry args={[0.05, 0.25, 0.05]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                </group>
            );
        }

        if (type === 'bed') {
            return (
                <group>
                    {/* Mattress */}
                    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.5, 0.3, 2]} />
                        <meshStandardMaterial color="white" />
                    </mesh>
                    {/* Frame */}
                    <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.6, 0.2, 2.1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Headboard */}
                    <mesh position={[0, 0.5, -1]} castShadow receiveShadow>
                        <boxGeometry args={[1.6, 1, 0.1]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Pillow */}
                    <mesh position={[0, 0.45, -0.8]} castShadow receiveShadow>
                        <boxGeometry args={[0.8, 0.1, 0.4]} />
                        <meshStandardMaterial color="#eee" />
                    </mesh>
                </group>
            );
        }

        if (type === 'sofa') {
            return (
                <group>
                    {/* Base */}
                    <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2, 0.4, 0.8]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Backrest */}
                    <mesh position={[0, 0.6, -0.3]} castShadow receiveShadow>
                        <boxGeometry args={[2, 0.6, 0.2]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Armrests */}
                    <mesh position={[-0.9, 0.4, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.2, 0.4, 0.8]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    <mesh position={[0.9, 0.4, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.2, 0.4, 0.8]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                </group>
            );
        }

        if (type === 'cabinet') {
            return (
                <group>
                    {/* Body */}
                    <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.8, 1.5, 0.5]} />
                        <meshStandardMaterial {...materialProps} />
                    </mesh>
                    {/* Doors */}
                    <mesh position={[-0.2, 0.75, 0.26]} castShadow receiveShadow>
                        <boxGeometry args={[0.38, 1.4, 0.02]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                    <mesh position={[0.2, 0.75, 0.26]} castShadow receiveShadow>
                        <boxGeometry args={[0.38, 1.4, 0.02]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                    {/* Knobs */}
                    <mesh position={[-0.05, 0.75, 0.28]} castShadow receiveShadow>
                        <sphereGeometry args={[0.03]} />
                        <meshStandardMaterial color="gold" />
                    </mesh>
                    <mesh position={[0.05, 0.75, 0.28]} castShadow receiveShadow>
                        <sphereGeometry args={[0.03]} />
                        <meshStandardMaterial color="gold" />
                    </mesh>
                </group>
            );
        }

        // Default Cube
        return (
            <mesh castShadow receiveShadow>
                <boxGeometry />
                <meshStandardMaterial {...materialProps} />
            </mesh>
        );
    };

    const content = renderContent();

    if (isSelected) {
        return (
            <TransformControls
                mode="translate"
                onMouseUp={(e) => {
                    if (e.target.object) {
                        updateObject(id, {
                            position: [e.target.object.position.x, e.target.object.position.y, e.target.object.position.z],
                            rotation: [e.target.object.rotation.x, e.target.object.rotation.y, e.target.object.rotation.z],
                            scale: [e.target.object.scale.x, e.target.object.scale.y, e.target.object.scale.z],
                        });
                    }
                }}
                {...props} // Pass position/rotation/scale here
            >
                {content}
            </TransformControls>
        );
    }

    return (
        <group {...props}>
            {content}
        </group>
    );
});

export default Furniture;
