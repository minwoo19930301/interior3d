import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
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

const CylinderPart = ({
  radiusTop,
  radiusBottom = radiusTop,
  height,
  segments = 18,
  position,
  rotation,
  color,
  material,
}) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />
    <meshStandardMaterial {...commonMaterial(color, material)} />
  </mesh>
);

const TorusPart = ({ radius, tube, position, rotation, color, material }) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <torusGeometry args={[radius, tube, 12, 24]} />
    <meshStandardMaterial {...commonMaterial(color, material)} />
  </mesh>
);

const HingedPanel = ({
  width,
  height,
  depth,
  center = [0, 0, 0],
  hinge = 'left',
  angle = 0,
  color,
  material,
  handleLength = 0.12,
}) => {
  const hingeX = center[0] + (hinge === 'left' ? -width / 2 : width / 2);
  const leafCenterX = hinge === 'left' ? width / 2 : -width / 2;
  const handleX = hinge === 'left' ? width / 2 - 0.04 : -width / 2 + 0.04;

  return (
    <group position={[hingeX, center[1], center[2]]} rotation={[0, angle, 0]}>
      <group position={[leafCenterX, 0, 0]}>
        <BoxPart size={[width, height, depth]} position={[0, 0, 0]} color={color} material={material} />
        <CylinderPart
          radiusTop={Math.min(0.015, depth * 0.45)}
          height={handleLength}
          position={[handleX, 0, depth / 2 + 0.01]}
          rotation={[Math.PI / 2, 0, 0]}
          color="#d1b26d"
          material={{ metalness: 0.82, roughness: 0.25 }}
        />
      </group>
    </group>
  );
};

const DoorSwingGuide = ({ width, hinge, isOpen }) => {
  const sweep = Math.PI * 0.55;
  const shape = useMemo(() => {
    const fan = new THREE.Shape();
    const radius = Math.max(width * 0.98, 0.2);
    fan.moveTo(0, 0);
    fan.absarc(0, 0, radius, 0, hinge === 'left' ? -sweep : sweep, hinge === 'left');
    fan.lineTo(0, 0);
    return fan;
  }, [hinge, sweep, width]);

  return (
    <group
      position={[hinge === 'left' ? -width / 2 + 0.01 : width / 2 - 0.01, 0.02, 0]}
      rotation={[0, hinge === 'right' ? Math.PI : 0, 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color="#7ccde4"
          transparent
          opacity={isOpen ? 0.16 : 0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

function renderStorage(type, dimensions, color, isOpen) {
  const [width, height, depth] = dimensions;
  const shell = Math.max(0.03, Math.min(0.06, depth * 0.12));
  const panelDepth = Math.max(0.018, depth * 0.05);
  const interiorWidth = Math.max(0.18, width - shell * 2);
  const interiorHeight = Math.max(0.24, height - shell * 2);
  const interiorDepth = Math.max(0.16, depth - shell * 1.2);
  const doorGap = 0.018;
  const doorWidth = Math.max(0.14, (width - doorGap * 3) / 2);
  const openAngle = isOpen ? Math.PI * 0.62 : 0;

  return (
    <group>
      <BoxPart size={[width, shell, depth]} position={[0, shell / 2, 0]} color="#6f5a4b" />
      <BoxPart size={[width, shell, depth]} position={[0, height - shell / 2, 0]} color="#6f5a4b" />
      <BoxPart size={[shell, height, depth]} position={[-width / 2 + shell / 2, height / 2, 0]} color={color} />
      <BoxPart size={[shell, height, depth]} position={[width / 2 - shell / 2, height / 2, 0]} color={color} />
      <BoxPart size={[interiorWidth, interiorHeight, shell]} position={[0, height / 2, -depth / 2 + shell / 2]} color="#5f4d40" />
      {type === 'wardrobe' ? (
        <>
          <BoxPart size={[interiorWidth * 0.92, shell, interiorDepth * 0.92]} position={[0, height * 0.56, 0]} color="#6b5647" />
          <CylinderPart radiusTop={0.014} height={interiorWidth * 0.82} position={[0, height * 0.78, -depth * 0.12]} rotation={[0, 0, Math.PI / 2]} color="#c8b28d" material={{ metalness: 0.4, roughness: 0.38 }} />
        </>
      ) : (
        <BoxPart size={[interiorWidth * 0.92, shell, interiorDepth * 0.88]} position={[0, height * 0.52, 0]} color="#6b5647" />
      )}
      <HingedPanel
        width={doorWidth}
        height={height - shell * 1.2}
        depth={panelDepth}
        center={[-width / 4 - doorGap / 2, height / 2, depth / 2 + panelDepth / 2]}
        hinge="left"
        angle={openAngle}
        color="#a18b77"
      />
      <HingedPanel
        width={doorWidth}
        height={height - shell * 1.2}
        depth={panelDepth}
        center={[width / 4 + doorGap / 2, height / 2, depth / 2 + panelDepth / 2]}
        hinge="right"
        angle={-openAngle}
        color="#a18b77"
      />
    </group>
  );
}

function renderSofa(dimensions, color) {
  const [width, height, depth] = dimensions;
  const baseHeight = height * 0.24;
  const seatHeight = height * 0.24;
  const backHeight = height * 0.28;
  const armWidth = Math.max(0.14, width * 0.11);
  const seatTop = baseHeight + seatHeight;
  const cushionGap = Math.min(0.04, width * 0.02);
  const cushionWidth = (width - armWidth * 2 - cushionGap * 4) / 3;

  return (
    <group>
      <BoxPart size={[width, baseHeight, depth * 0.9]} position={[0, baseHeight / 2, 0]} color="#665244" />
      <BoxPart size={[width * 0.86, seatHeight, depth * 0.64]} position={[0, baseHeight + seatHeight / 2, 0.02]} color={color} />
      {[-1, 0, 1].map((index) => (
        <BoxPart
          key={index}
          size={[cushionWidth, seatHeight * 0.92, depth * 0.58]}
          position={[index * (cushionWidth + cushionGap), seatTop - seatHeight * 0.04, 0.03]}
          color="#9a8674"
        />
      ))}
      <BoxPart size={[width * 0.9, backHeight, depth * 0.18]} position={[0, seatTop + backHeight / 2 - 0.02, -depth / 2 + depth * 0.12]} color="#766353" />
      <BoxPart size={[armWidth, height * 0.54, depth * 0.82]} position={[-width / 2 + armWidth / 2, height * 0.27, 0]} color="#6f5c4f" />
      <BoxPart size={[armWidth, height * 0.54, depth * 0.82]} position={[width / 2 - armWidth / 2, height * 0.27, 0]} color="#6f5c4f" />
    </group>
  );
}

function renderDoor(dimensions, color, isOpen, swing) {
  const [width, height, depth] = dimensions;
  const frameThickness = Math.max(0.04, Math.min(0.07, width * 0.08));
  const leafDepth = Math.max(0.03, depth * 0.34);
  const leafWidth = Math.max(0.18, width - frameThickness * 1.4);
  const leafHeight = Math.max(1.6, height - frameThickness * 1.4);
  const hinge = swing === 'right' ? 'right' : 'left';
  const openAngle = isOpen ? (hinge === 'left' ? -Math.PI * 0.55 : Math.PI * 0.55) : 0;

  return (
    <group>
      <DoorSwingGuide width={width} hinge={hinge} isOpen={isOpen} />
      <BoxPart size={[width, frameThickness, depth]} position={[0, height - frameThickness / 2, 0]} color="#72543d" />
      <BoxPart size={[frameThickness, height, depth]} position={[-width / 2 + frameThickness / 2, height / 2, 0]} color="#72543d" />
      <BoxPart size={[frameThickness, height, depth]} position={[width / 2 - frameThickness / 2, height / 2, 0]} color="#72543d" />
      <HingedPanel
        width={leafWidth}
        height={leafHeight}
        depth={leafDepth}
        center={[0, leafHeight / 2, depth / 2 - leafDepth / 2]}
        hinge={hinge}
        angle={openAngle}
        color={color}
        material={{ roughness: 0.52 }}
        handleLength={Math.min(0.18, leafHeight * 0.16)}
      />
      <BoxPart size={[width, 0.03, depth]} position={[0, 0.015, 0]} color="#b4a798" />
    </group>
  );
}

function renderFurniture(type, dimensions, color, isOpen, swing) {
  const [width, height, depth] = dimensions;

  if (type === 'wall') {
    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
        <BoxPart size={[width, 0.05, depth + 0.02]} position={[0, 0.025, 0]} color="#c0b8ab" />
      </group>
    );
  }

  if (type === 'floorPanel') {
    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, -height / 2, 0]} color={color} />
        <BoxPart size={[width * 0.98, 0.02, depth * 0.98]} position={[0, 0.01, 0]} color="#a48769" />
      </group>
    );
  }

  if (type === 'ceilingPanel') {
    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
        <BoxPart size={[width * 0.96, 0.015, depth * 0.96]} position={[0, 0.01, 0]} color="#f2f5f8" />
      </group>
    );
  }

  if (type === 'door') {
    return renderDoor(dimensions, color, isOpen, swing);
  }

  if (type === 'table') {
    const topThickness = Math.max(0.05, height * 0.08);
    const legSize = Math.min(0.09, Math.min(width, depth) * 0.1);
    const legHeight = height - topThickness;
    const offsetX = width / 2 - legSize / 2 - 0.05;
    const offsetZ = depth / 2 - legSize / 2 - 0.05;

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
        <BoxPart size={[width * 0.28, legHeight, depth * 0.6]} position={[width * 0.26, legHeight / 2, 0]} color="#6a4b38" />
        <BoxPart size={[width, legHeight * 0.4, 0.04]} position={[0, legHeight * 0.34, -depth / 2 + 0.02]} color="#654633" />
        {[-width / 2 + legSize / 2, width / 2 - legSize / 2].map((x) => (
          <BoxPart
            key={x}
            size={[legSize, legHeight, legSize]}
            position={[x, legHeight / 2, depth / 2 - legSize / 2]}
            color="#4f3829"
          />
        ))}
        <BoxPart size={[legSize, legHeight, legSize]} position={[-width / 2 + legSize / 2, legHeight / 2, -depth / 2 + legSize / 2]} color="#4f3829" />
      </group>
    );
  }

  if (type === 'chair') {
    const seatThickness = Math.max(0.04, height * 0.07);
    const seatHeight = height * 0.46;
    const backHeight = Math.max(height * 0.38, 0.28);
    const legSize = Math.min(0.055, Math.min(width, depth) * 0.1);
    const offsetX = width / 2 - legSize / 2 - 0.03;
    const offsetZ = depth / 2 - legSize / 2 - 0.03;

    return (
      <group>
        <BoxPart size={[width, seatThickness, depth * 0.88]} position={[0, seatHeight, 0]} color={color} />
        <BoxPart size={[width * 0.92, backHeight, seatThickness]} position={[0, seatHeight + backHeight / 2, -depth / 2 + seatThickness / 2]} color="#764c32" />
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
    return renderSofa(dimensions, color);
  }

  if (type === 'cabinet' || type === 'wardrobe') {
    return renderStorage(type, dimensions, color, isOpen);
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
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} material={{ metalness: 0.24, roughness: 0.3 }} />
        <BoxPart size={[width * 0.46, height * 0.56, 0.02]} position={[-width * 0.24, height * 0.7, depth / 2 + 0.01]} color="#eef3f7" />
        <BoxPart size={[width * 0.46, height * 0.32, 0.02]} position={[width * 0.24, height * 0.26, depth / 2 + 0.01]} color="#eef3f7" />
        <CylinderPart radiusTop={0.012} height={height * 0.3} position={[-width * 0.02, height * 0.66, depth / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#8e98a3" material={{ metalness: 0.78, roughness: 0.24 }} />
        <CylinderPart radiusTop={0.012} height={height * 0.2} position={[width * 0.14, height * 0.24, depth / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#8e98a3" material={{ metalness: 0.78, roughness: 0.24 }} />
      </group>
    );
  }

  if (type === 'washingMachine') {
    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
        <CylinderPart radiusTop={Math.min(width, height) * 0.26} height={0.08} position={[0, height * 0.48, depth / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]} color="#4a5665" material={{ metalness: 0.45, roughness: 0.22 }} />
        <CylinderPart radiusTop={Math.min(width, height) * 0.18} height={0.08} position={[0, height * 0.48, depth / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]} color="#90b2cc" material={{ metalness: 0.3, roughness: 0.14, transparent: true, opacity: 0.72 }} />
        <BoxPart size={[width * 0.7, height * 0.1, 0.03]} position={[0, height * 0.9, depth / 2 + 0.02]} color="#ced6df" />
      </group>
    );
  }

  if (type === 'sink') {
    const counterHeight = Math.max(0.08, height * 0.12);

    return (
      <group>
        <BoxPart size={[width, height - counterHeight, depth * 0.9]} position={[0, (height - counterHeight) / 2, 0]} color="#7f6758" />
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
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} material={{ metalness: 0.48, roughness: 0.18 }} />
        {[-width * 0.22, width * 0.22].flatMap((x) =>
          [-depth * 0.2, depth * 0.2].map((z) => (
            <CylinderPart
              key={`${x}-${z}`}
              radiusTop={Math.min(width, depth) * 0.1}
              height={0.02}
              position={[x, height + 0.01, z]}
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
      </group>
    );
  }

  if (type === 'shower') {
    return (
      <group>
        <BoxPart size={[width, 0.05, depth]} position={[0, 0.025, 0]} color="#d7dde4" />
        <BoxPart size={[0.025, height, depth]} position={[-width / 2 + 0.0125, height / 2, 0]} color="#bfe1f0" material={{ transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.1 }} />
        <BoxPart size={[width, height, 0.025]} position={[0, height / 2, -depth / 2 + 0.0125]} color="#bfe1f0" material={{ transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.1 }} />
        <CylinderPart radiusTop={0.014} height={height * 0.68} position={[width * 0.34, height * 0.64, -depth * 0.28]} color="#b6c2ce" material={{ metalness: 0.85, roughness: 0.24 }} />
      </group>
    );
  }

  return <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} />;
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
  isOpen,
  swing,
  onClick,
  onDoubleClick,
}) => {
  const updateObject = useStore((state) => state.updateObject);
  const groupRef = useRef(null);
  const content = useMemo(
    () => renderFurniture(type, dimensions, color, isOpen, swing),
    [type, dimensions, color, isOpen, swing],
  );

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
        onDoubleClick={onDoubleClick}
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
          showY={transformMode === 'rotate'}
          showZ={transformMode !== 'rotate'}
          rotationSnap={transformMode === 'rotate' ? Math.PI / 24 : undefined}
          onMouseUp={handleObjectChange}
          onTouchEnd={handleObjectChange}
        />
      ) : null}
    </>
  );
};

export default React.memo(Furniture);
