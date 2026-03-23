import React, { useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import useStore from '../store/useStore';

const commonMaterial = (color, extra = {}) => ({
    color,
    roughness: extra.roughness ?? 0.62,
    metalness: extra.metalness ?? 0.12,
    transparent: extra.transparent ?? false,
    opacity: extra.opacity ?? 1,
});

const BoxPart = ({ size, position, color, rotation, material }) => (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial {...commonMaterial(color, material)} />
    </mesh>
);

const CylinderPart = ({ radiusTop, radiusBottom = radiusTop, height, segments = 32, position, rotation, color, material }) => (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
        <cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />
        <meshStandardMaterial {...commonMaterial(color, material)} />
    </mesh>
);

const TorusPart = ({ radius, tube, position, rotation, color, material }) => (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
        <torusGeometry args={[radius, tube, 24, 60]} />
        <meshStandardMaterial {...commonMaterial(color, material)} />
    </mesh>
);

function renderFurniture(type, dimensions, color) {
    const [width, height, depth] = dimensions;

    if (type === 'wall') {
        return (
            <group>
                <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
                <BoxPart size={[width, 0.06, depth + 0.02]} position={[0, 0.03, 0]} color="#c0b8ab" />
            </group>
        );
    }

    if (type === 'table') {
        const topThickness = Math.max(0.05, height * 0.08);
        const legSize = Math.min(0.1, Math.min(width, depth) * 0.1);
        const legHeight = height - topThickness;
        const offsetX = width / 2 - legSize / 2 - 0.06;
        const offsetZ = depth / 2 - legSize / 2 - 0.06;

        return (
            <group>
                <BoxPart size={[width, topThickness, depth]} position={[0, legHeight + topThickness / 2, 0]} color={color} />
                {[-offsetX, offsetX].flatMap((x) =>
                    [-offsetZ, offsetZ].map((z) => (
                        <BoxPart
                            key={`${x}-${z}`}
                            size={[legSize, legHeight, legSize]}
                            position={[x, legHeight / 2, z]}
                            color="#4f3829"
                        />
                    )),
                )}
            </group>
        );
    }

    if (type === 'desk') {
        const topThickness = Math.max(0.05, height * 0.08);
        const legSize = Math.min(0.08, Math.min(width, depth) * 0.08);
        const legHeight = height - topThickness;

        return (
            <group>
                <BoxPart size={[width, topThickness, depth]} position={[0, legHeight + topThickness / 2, 0]} color={color} />
                <BoxPart size={[width * 0.34, topThickness * 2, depth * 0.55]} position={[width * 0.22, legHeight - topThickness, 0]} color="#6d4b34" />
                <BoxPart size={[width, legHeight * 0.46, 0.04]} position={[0, legHeight * 0.38, -depth / 2 + 0.02]} color="#654633" />
                {[-width / 2 + legSize / 2, width / 2 - legSize / 2].map((x) => (
                    <BoxPart
                        key={x}
                        size={[legSize, legHeight, legSize]}
                        position={[x, legHeight / 2, depth / 2 - legSize / 2]}
                        color="#4f3829"
                    />
                ))}
                <BoxPart size={[legSize, legHeight, legSize]} position={[-width / 2 + legSize / 2, legHeight / 2, -depth / 2 + legSize / 2]} color="#4f3829" />
                <BoxPart size={[width * 0.28, legHeight, depth * 0.64]} position={[width * 0.26, legHeight / 2, 0]} color="#5d4030" />
            </group>
        );
    }

    if (type === 'chair') {
        const seatThickness = Math.max(0.04, height * 0.07);
        const seatHeight = height * 0.46;
        const backHeight = Math.max(height * 0.42, 0.3);
        const legSize = Math.min(0.06, Math.min(width, depth) * 0.1);
        const offsetX = width / 2 - legSize / 2 - 0.03;
        const offsetZ = depth / 2 - legSize / 2 - 0.03;

        return (
            <group>
                <BoxPart size={[width, seatThickness, depth * 0.92]} position={[0, seatHeight, 0]} color={color} />
                <BoxPart size={[width, backHeight, seatThickness]} position={[0, seatHeight + backHeight / 2, -depth / 2 + seatThickness / 2]} color="#764c32" />
                {[-offsetX, offsetX].flatMap((x) =>
                    [-offsetZ, offsetZ].map((z) => (
                        <BoxPart
                            key={`${x}-${z}`}
                            size={[legSize, seatHeight, legSize]}
                            position={[x, seatHeight / 2, z]}
                            color="#5a3d2c"
                        />
                    )),
                )}
            </group>
        );
    }

    if (type === 'bed') {
        const frameHeight = Math.max(0.12, height * 0.22);
        const mattressHeight = Math.max(0.18, height * 0.34);
        const mattressTop = frameHeight + mattressHeight;

        return (
            <group>
                <BoxPart size={[width, frameHeight, depth]} position={[0, frameHeight / 2, 0]} color={color} />
                <BoxPart size={[width * 0.95, mattressHeight, depth * 0.94]} position={[0, frameHeight + mattressHeight / 2, 0]} color="#f2f0eb" />
                <BoxPart size={[width, height, 0.08]} position={[0, height / 2, -depth / 2 + 0.04]} color="#5b473f" />
                <BoxPart size={[width * 0.28, 0.1, depth * 0.18]} position={[-width * 0.18, mattressTop - 0.02, -depth * 0.28]} color="#ffffff" />
                <BoxPart size={[width * 0.28, 0.1, depth * 0.18]} position={[width * 0.18, mattressTop - 0.02, -depth * 0.28]} color="#ffffff" />
            </group>
        );
    }

    if (type === 'sofa') {
        const seatHeight = height * 0.45;
        const backHeight = height * 0.58;
        const armWidth = Math.max(0.14, width * 0.1);

        return (
            <group>
                <BoxPart size={[width, seatHeight, depth]} position={[0, seatHeight / 2, 0]} color={color} />
                <BoxPart size={[width, backHeight, depth * 0.18]} position={[0, seatHeight + backHeight / 2 - 0.02, -depth / 2 + depth * 0.09]} color="#6d5a4e" />
                <BoxPart size={[armWidth, height * 0.6, depth]} position={[-width / 2 + armWidth / 2, height * 0.3, 0]} color="#715d51" />
                <BoxPart size={[armWidth, height * 0.6, depth]} position={[width / 2 - armWidth / 2, height * 0.3, 0]} color="#715d51" />
            </group>
        );
    }

    if (type === 'cabinet' || type === 'wardrobe') {
        const doorGap = 0.02;
        const doorWidth = (width - doorGap * 3) / 2;

        return (
            <group>
                <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
                <BoxPart size={[doorWidth, height * 0.94, 0.02]} position={[-width / 4, height / 2, depth / 2 + 0.01]} color="#9e8875" />
                <BoxPart size={[doorWidth, height * 0.94, 0.02]} position={[width / 4, height / 2, depth / 2 + 0.01]} color="#9e8875" />
                <CylinderPart radiusTop={0.015} height={0.12} position={[-0.03, height / 2, depth / 2 + 0.025]} rotation={[Math.PI / 2, 0, 0]} color="#d1b26d" material={{ metalness: 0.8, roughness: 0.28 }} />
                <CylinderPart radiusTop={0.015} height={0.12} position={[0.03, height / 2, depth / 2 + 0.025]} rotation={[Math.PI / 2, 0, 0]} color="#d1b26d" material={{ metalness: 0.8, roughness: 0.28 }} />
            </group>
        );
    }

    if (type === 'tv') {
        const screenHeight = height * 0.68;
        const baseHeight = height * 0.08;

        return (
            <group>
                <BoxPart size={[width, screenHeight, depth]} position={[0, height - screenHeight / 2, 0]} color="#111418" />
                <BoxPart size={[width * 0.96, screenHeight * 0.9, depth / 2]} position={[0, height - screenHeight / 2, depth * 0.26]} color="#27313d" />
                <CylinderPart radiusTop={0.04} height={height * 0.26} position={[0, height * 0.18, 0]} color="#5b6675" />
                <BoxPart size={[width * 0.42, baseHeight, depth * 3.2]} position={[0, baseHeight / 2, depth * 0.1]} color="#4e5967" />
            </group>
        );
    }

    if (type === 'refrigerator') {
        return (
            <group>
                <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} material={{ metalness: 0.25, roughness: 0.3 }} />
                <BoxPart size={[width * 0.46, height * 0.58, 0.02]} position={[-width * 0.24, height * 0.7, depth / 2 + 0.01]} color="#eef3f7" />
                <BoxPart size={[width * 0.46, height * 0.34, 0.02]} position={[width * 0.24, height * 0.26, depth / 2 + 0.01]} color="#eef3f7" />
                <CylinderPart radiusTop={0.012} height={height * 0.34} position={[-width * 0.02, height * 0.66, depth / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#8e98a3" material={{ metalness: 0.85, roughness: 0.24 }} />
                <CylinderPart radiusTop={0.012} height={height * 0.24} position={[width * 0.14, height * 0.24, depth / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#8e98a3" material={{ metalness: 0.85, roughness: 0.24 }} />
            </group>
        );
    }

    if (type === 'washingMachine') {
        return (
            <group>
                <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
                <CylinderPart radiusTop={Math.min(width, height) * 0.27} height={0.08} position={[0, height * 0.48, depth / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]} color="#4a5665" material={{ metalness: 0.45, roughness: 0.22 }} />
                <CylinderPart radiusTop={Math.min(width, height) * 0.19} height={0.09} position={[0, height * 0.48, depth / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]} color="#90b2cc" material={{ metalness: 0.3, roughness: 0.14, transparent: true, opacity: 0.72 }} />
                <BoxPart size={[width * 0.7, height * 0.12, 0.03]} position={[0, height * 0.9, depth / 2 + 0.02]} color="#ced6df" />
            </group>
        );
    }

    if (type === 'sink') {
        const counterHeight = Math.max(0.08, height * 0.12);

        return (
            <group>
                <BoxPart size={[width, height - counterHeight, depth * 0.92]} position={[0, (height - counterHeight) / 2, 0]} color="#7f6758" />
                <BoxPart size={[width, counterHeight, depth]} position={[0, height - counterHeight / 2, 0]} color={color} />
                <BoxPart size={[width * 0.5, counterHeight * 0.7, depth * 0.44]} position={[0, height - counterHeight / 2 + 0.01, 0]} color="#59626f" />
                <CylinderPart radiusTop={0.018} height={height * 0.22} position={[0, height + height * 0.06, -depth * 0.12]} color="#d8e0e7" material={{ metalness: 0.9, roughness: 0.18 }} />
                <CylinderPart radiusTop={0.014} height={depth * 0.22} position={[0.08, height + height * 0.12, -depth * 0.05]} rotation={[0, 0, Math.PI / 2]} color="#d8e0e7" material={{ metalness: 0.9, roughness: 0.18 }} />
            </group>
        );
    }

    if (type === 'cooktop') {
        return (
            <group>
                <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} material={{ metalness: 0.5, roughness: 0.18 }} />
                {[-width * 0.22, width * 0.22].flatMap((x) =>
                    [-depth * 0.2, depth * 0.2].map((z) => (
                        <CylinderPart
                            key={`${x}-${z}`}
                            radiusTop={Math.min(width, depth) * 0.11}
                            height={0.03}
                            position={[x, height + 0.015, z]}
                            color="#414b58"
                        />
                    )),
                )}
            </group>
        );
    }

    if (type === 'bathtub') {
        return (
            <group>
                <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
                <BoxPart size={[width * 0.84, height * 0.58, depth * 0.72]} position={[0, height * 0.56, 0]} color="#d5dde5" />
                <CylinderPart radiusTop={0.018} height={height * 0.22} position={[width * 0.32, height + height * 0.08, -depth * 0.18]} color="#bcc7d2" material={{ metalness: 0.85, roughness: 0.2 }} />
            </group>
        );
    }

    if (type === 'toilet') {
        const baseHeight = height * 0.36;
        const bowlHeight = height * 0.28;
        const tankHeight = height * 0.3;
        const tankDepth = depth * 0.28;

        return (
            <group>
                <CylinderPart
                    radiusTop={width * 0.18}
                    radiusBottom={width * 0.12}
                    height={baseHeight}
                    position={[0, baseHeight / 2, depth * 0.1]}
                    color={color}
                />
                <CylinderPart
                    radiusTop={width * 0.26}
                    radiusBottom={width * 0.21}
                    height={bowlHeight}
                    position={[0, baseHeight + bowlHeight / 2 - 0.02, depth * 0.06]}
                    color={color}
                />
                <CylinderPart
                    radiusTop={width * 0.14}
                    radiusBottom={width * 0.11}
                    height={height * 0.16}
                    position={[0, baseHeight + bowlHeight * 0.34, depth * 0.07]}
                    color="#dfe7ef"
                />
                <TorusPart
                    radius={width * 0.19}
                    tube={height * 0.034}
                    position={[0, baseHeight + bowlHeight * 0.6, depth * 0.07]}
                    rotation={[Math.PI / 2, 0, 0]}
                    color="#f7fafc"
                />
                <BoxPart
                    size={[width * 0.62, height * 0.035, depth * 0.48]}
                    position={[0, baseHeight + bowlHeight * 0.73, depth * 0.03]}
                    color="#f6f9fc"
                    rotation={[0.12, 0, 0]}
                />
                <BoxPart
                    size={[width * 0.68, tankHeight, tankDepth]}
                    position={[0, height - tankHeight / 2, -depth * 0.22]}
                    color={color}
                />
                <BoxPart
                    size={[width * 0.66, height * 0.03, tankDepth]}
                    position={[0, height - height * 0.015, -depth * 0.22]}
                    color="#f4f7fa"
                />
                <CylinderPart
                    radiusTop={0.026}
                    height={0.03}
                    position={[0, height - 0.004, -depth * 0.18]}
                    color="#b8c1ca"
                    material={{ metalness: 0.8, roughness: 0.24 }}
                />
                <CylinderPart
                    radiusTop={0.018}
                    height={height * 0.14}
                    position={[0, height * 0.9, -depth * 0.38]}
                    rotation={[Math.PI / 2, 0, 0]}
                    color="#c8d1d9"
                    material={{ metalness: 0.72, roughness: 0.26 }}
                />
            </group>
        );
    }

    if (type === 'shower') {
        return (
            <group>
                <BoxPart size={[width, 0.06, depth]} position={[0, 0.03, 0]} color="#d7dde4" />
                <BoxPart size={[0.03, height, depth]} position={[-width / 2 + 0.015, height / 2, 0]} color="#bfe1f0" material={{ transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 }} />
                <BoxPart size={[width, height, 0.03]} position={[0, height / 2, -depth / 2 + 0.015]} color="#bfe1f0" material={{ transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 }} />
                <CylinderPart radiusTop={0.015} height={height * 0.7} position={[width * 0.34, height * 0.65, -depth * 0.28]} color="#b6c2ce" material={{ metalness: 0.85, roughness: 0.24 }} />
                <CylinderPart radiusTop={0.014} height={width * 0.24} position={[width * 0.22, height * 0.95, -depth * 0.28]} rotation={[0, 0, Math.PI / 2]} color="#b6c2ce" material={{ metalness: 0.85, roughness: 0.24 }} />
                <CylinderPart radiusTop={0.06} height={0.03} position={[width * 0.1, height * 0.95, -depth * 0.28]} color="#d5dde5" />
            </group>
        );
    }

    return (
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
    );
}

const Furniture = ({
    id,
    type,
    color,
    position,
    rotation,
    dimensions,
    transformMode,
    isSelected,
    onClick,
}) => {
    const updateObject = useStore((state) => state.updateObject);
    const groupRef = useRef(null);
    const content = renderFurniture(type, dimensions, color);

    const outline = isSelected ? (
        <mesh position={[0, dimensions[1] / 2, 0]} renderOrder={3}>
            <boxGeometry args={dimensions.map((value) => value * 1.02)} />
            <meshBasicMaterial color="#ff8ab5" transparent opacity={0.65} wireframe />
        </mesh>
    ) : null;

    const handleObjectChange = () => {
        const object = groupRef.current;

        if (!object) {
            return;
        }

        updateObject(id, {
            position: [object.position.x, object.position.y, object.position.z],
            rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
        });
    };

    return (
        <>
            <group
                ref={groupRef}
                position={position}
                rotation={rotation}
                onClick={onClick}
            >
                {content}
                {outline}
            </group>

            {isSelected ? (
                <TransformControls
                    object={groupRef}
                    mode={transformMode}
                    space={transformMode === 'rotate' ? 'local' : 'world'}
                    showX={transformMode !== 'rotate'}
                    showY
                    showZ={transformMode !== 'rotate'}
                    rotationSnap={transformMode === 'rotate' ? Math.PI / 24 : undefined}
                    onMouseUp={handleObjectChange}
                    onTouchEnd={handleObjectChange}
                />
            ) : null}
        </>
    );
};

export default Furniture;
