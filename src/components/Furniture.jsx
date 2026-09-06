import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { TransformControls, RoundedBox } from '@react-three/drei';
import BlenderFurniture from './BlenderFurniture';
import useStore from '../store/useStore';
import { clampDimensions, getObjectDefinition, roundNumber } from '../lib/objectCatalog';
import {
  getWoodTexture,
  getFabricTexture,
  getBrushedMetalTexture,
} from '../lib/textures';

const BRASS = '#b08d57';

const commonMaterial = (color, extra = {}) => ({
  color,
  roughness: extra.roughness ?? 0.62,
  metalness: extra.metalness ?? 0.12,
  transparent: extra.transparent ?? false,
  opacity: extra.opacity ?? 1,
  ...(extra.map !== undefined ? { map: extra.map } : {}),
  ...(extra.bumpMap !== undefined ? { bumpMap: extra.bumpMap } : {}),
  ...(extra.bumpScale !== undefined ? { bumpScale: extra.bumpScale } : {}),
  ...(extra.emissive !== undefined ? { emissive: extra.emissive } : {}),
  ...(extra.emissiveMap !== undefined ? { emissiveMap: extra.emissiveMap } : {}),
  ...(extra.emissiveIntensity !== undefined ? { emissiveIntensity: extra.emissiveIntensity } : {}),
  ...(extra.envMapIntensity !== undefined ? { envMapIntensity: extra.envMapIntensity } : {}),
});

function mixHexColors(baseColor, targetColor, amount) {
  const base = new THREE.Color(baseColor);
  return `#${base.lerp(new THREE.Color(targetColor), amount).getHexString()}`;
}

function areDimensionsEqual(current, next) {
  return current.every((value, index) => Math.abs(value - next[index]) < 0.001);
}

function arePositionsEqual(current, next) {
  return current.every((value, index) => Math.abs(value - next[index]) < 0.001);
}

const BoxPart = ({ size, position, color, rotation, material, radius = 0 }) => {
  if (radius > 0) {
    return (
      <RoundedBox
        args={size}
        radius={Math.min(radius, Math.min(...size) * 0.49)}
        smoothness={4}
        castShadow
        receiveShadow
        position={position}
        rotation={rotation}
      >
        <meshStandardMaterial {...commonMaterial(color, material)} />
      </RoundedBox>
    );
  }

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial {...commonMaterial(color, material)} />
    </mesh>
  );
};

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

const HingedPanel = ({
  width,
  height,
  depth,
  center = [0, 0, 0],
  hinge = 'left',
  angle = 0,
  color,
  material,
  radius = 0,
  handleLength = 0.12,
}) => {
  const hingeX = center[0] + (hinge === 'left' ? -width / 2 : width / 2);
  const leafCenterX = hinge === 'left' ? width / 2 : -width / 2;
  const handleX = hinge === 'left' ? width / 2 - 0.04 : -width / 2 + 0.04;

  return (
    <group position={[hingeX, center[1], center[2]]} rotation={[0, angle, 0]}>
      <group position={[leafCenterX, 0, 0]}>
        <BoxPart size={[width, height, depth]} position={[0, 0, 0]} color={color} material={material} radius={radius} />
        <CylinderPart
          radiusTop={Math.min(0.015, depth * 0.45)}
          height={handleLength}
          position={[handleX, 0, depth / 2 + 0.01]}
          rotation={[Math.PI / 2, 0, 0]}
          color={BRASS}
          material={{ map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 }}
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
      <BoxPart size={[width, frameThickness, depth]} position={[0, height - frameThickness / 2, 0]} color="#72543d" material={{ map: getWoodTexture('warm'), roughness: 0.55 }} />
      <BoxPart size={[frameThickness, height, depth]} position={[-width / 2 + frameThickness / 2, height / 2, 0]} color="#72543d" material={{ map: getWoodTexture('warm'), roughness: 0.55 }} />
      <BoxPart size={[frameThickness, height, depth]} position={[width / 2 - frameThickness / 2, height / 2, 0]} color="#72543d" material={{ map: getWoodTexture('warm'), roughness: 0.55 }} />
      <HingedPanel
        width={leafWidth}
        height={leafHeight}
        depth={leafDepth}
        center={[0, leafHeight / 2, depth / 2 - leafDepth / 2]}
        hinge={hinge}
        angle={openAngle}
        color={color}
        material={{ map: getWoodTexture('warm'), roughness: 0.52 }}
        radius={0.008}
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
        <BoxPart
          size={[width, height, depth]}
          position={[0, height / 2, 0]}
          color={color}
          material={{ bumpMap: getFabricTexture(), bumpScale: 0.02 }}
        />
        <BoxPart size={[width, 0.05, depth + 0.02]} position={[0, 0.025, 0]} color="#c0b8ab" />
      </group>
    );
  }

  if (type === 'floorPanel') {
    const baseColor = mixHexColors(color, '#a39a8f', 0.18);
    const repeatKey = `${roundNumber(width / 0.9)}x${roundNumber(depth / 0.9)}`;
    const topTexture = getWoodTexture('warm', repeatKey);
    topTexture.repeat.set(width / 0.9, depth / 0.9);

    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, -height / 2, 0]} color={baseColor} />
        <BoxPart
          size={[width * 0.98, 0.02, depth * 0.98]}
          position={[0, -0.01, 0]}
          color={color}
          material={{ map: topTexture, roughness: 0.7 }}
        />
      </group>
    );
  }

  if (type === 'ceilingPanel') {
    const edgeColor = mixHexColors(color, '#c8d0d9', 0.18);

    return (
      <group>
        <BoxPart
          size={[width, height, depth]}
          position={[0, height / 2, 0]}
          color={edgeColor}
          material={{ bumpMap: getFabricTexture(), bumpScale: 0.02 }}
        />
        <BoxPart
          size={[width * 0.96, 0.015, depth * 0.96]}
          position={[0, 0.01, 0]}
          color={color}
        />
      </group>
    );
  }

  if (type === 'door') {
    return renderDoor(dimensions, color, isOpen, swing);
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
  const setObjectTransforming = useStore((state) => state.setObjectTransforming);
  const groupRef = useRef(null);
  const resizeStateRef = useRef(null);
  const draftTransformRef = useRef(null);
  const [draftTransform, setDraftTransform] = useState(null);
  const activeTransform = isSelected && draftTransform ? draftTransform : null;
  const activeDimensions = activeTransform?.dimensions ?? dimensions;
  const activePosition = activeTransform?.position ?? position;
  const definition = getObjectDefinition(type);
  const minWidth = definition.minDimensions?.[0] ?? 0.2;
  const minDepth = definition.minDimensions?.[2] ?? 0.05;
  const controlMode = transformMode === 'rotate' ? 'rotate' : 'translate';

  const content = useMemo(
    () => definition.reference
      ? <BlenderFurniture type={type} reference={definition.reference} dimensions={activeDimensions} color={color} defaultColor={definition.color} isOpen={isOpen} />
      : renderFurniture(type, activeDimensions, color, isOpen, swing),
    [type, activeDimensions, color, isOpen, swing, definition],
  );

  const outline = isSelected ? (
    <mesh position={[0, activeDimensions[1] / 2, 0]} renderOrder={3}>
      <boxGeometry args={activeDimensions.map((value) => value * 1.02)} />
      <meshBasicMaterial color="#b08d57" transparent opacity={0.65} wireframe />
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

  const handleResizeStart = (signX, signZ) => (event) => {
    event.stopPropagation();
    event.target.setPointerCapture?.(event.pointerId);
    const object = groupRef.current;

    if (!object) {
      return;
    }

    const worldPosition = new THREE.Vector3();
    object.getWorldPosition(worldPosition);
    const startDimensions = [...dimensions];
    const startPosition = [...position];

    resizeStateRef.current = {
      pointerId: event.pointerId,
      plane: new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        worldPosition,
      ),
      matrixWorld: object.matrixWorld.clone(),
      inverseMatrixWorld: object.matrixWorld.clone().invert(),
      signX,
      signZ,
      startDimensions,
      startPosition,
    };
    setObjectTransforming(true);
    const nextTransform = {
      dimensions: startDimensions,
      position: startPosition,
    };
    draftTransformRef.current = nextTransform;
    setDraftTransform(nextTransform);
  };

  const handleResizeMove = (event) => {
    const resizeState = resizeStateRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    const intersectionPoint = new THREE.Vector3();

    if (!event.ray.intersectPlane(resizeState.plane, intersectionPoint)) {
      return;
    }

    const localPoint = intersectionPoint
      .clone()
      .applyMatrix4(resizeState.inverseMatrixWorld);
    const startWidth = resizeState.startDimensions[0];
    const startDepth = resizeState.startDimensions[2];
    let minX = -startWidth / 2;
    let maxX = startWidth / 2;
    let minZ = -startDepth / 2;
    let maxZ = startDepth / 2;

    if (resizeState.signX > 0) {
      maxX = Math.max(localPoint.x, minX + minWidth);
    } else if (resizeState.signX < 0) {
      minX = Math.min(localPoint.x, maxX - minWidth);
    }

    if (resizeState.signZ > 0) {
      maxZ = Math.max(localPoint.z, minZ + minDepth);
    } else if (resizeState.signZ < 0) {
      minZ = Math.min(localPoint.z, maxZ - minDepth);
    }

    const nextDimensions = clampDimensions(type, [
      roundNumber(maxX - minX),
      resizeState.startDimensions[1],
      roundNumber(maxZ - minZ),
    ]);
    const localCenter = new THREE.Vector3(
      resizeState.signX === 0 ? 0 : (minX + maxX) / 2,
      0,
      resizeState.signZ === 0 ? 0 : (minZ + maxZ) / 2,
    );
    const worldCenter = localCenter.applyMatrix4(resizeState.matrixWorld);
    const nextTransform = {
      dimensions: nextDimensions,
      position: [
        roundNumber(worldCenter.x),
        roundNumber(resizeState.startPosition[1]),
        roundNumber(worldCenter.z),
      ],
    };

    draftTransformRef.current = nextTransform;
    setDraftTransform(nextTransform);
  };

  const finishResize = (event) => {
    const resizeState = resizeStateRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    event.target.releasePointerCapture?.(event.pointerId);
    resizeStateRef.current = null;
    setObjectTransforming(false);

    const nextTransform = draftTransformRef.current;

    if (
      nextTransform &&
      (!areDimensionsEqual(dimensions, nextTransform.dimensions) ||
        !arePositionsEqual(position, nextTransform.position))
    ) {
      updateObject(id, nextTransform);
      draftTransformRef.current = null;
      setDraftTransform(null);
      return;
    }

    draftTransformRef.current = null;
    setDraftTransform(null);
  };

  const resizeHandleSize = Math.min(
    0.16,
    Math.max(0.08, Math.min(activeDimensions[0], activeDimensions[2]) * 0.13),
  );
  const resizeHandleY = Math.min(
    Math.max(0.06, activeDimensions[1] * 0.18),
    Math.max(0.12, activeDimensions[1] - 0.02),
  );
  const resizeHandles =
    isSelected
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].map(([signX, signZ]) => (
          <mesh
            key={`${signX}-${signZ}`}
            position={[
              signX * activeDimensions[0] / 2,
              resizeHandleY,
              signZ * activeDimensions[2] / 2,
            ]}
            renderOrder={4}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={handleResizeStart(signX, signZ)}
            onPointerMove={handleResizeMove}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
          >
            {signX !== 0 && signZ !== 0 ? (
              <sphereGeometry args={[resizeHandleSize / 2, 18, 18]} />
            ) : (
              <boxGeometry
                args={[
                  signX === 0 ? resizeHandleSize * 1.25 : resizeHandleSize * 0.78,
                  resizeHandleSize * 0.58,
                  signZ === 0 ? resizeHandleSize * 1.25 : resizeHandleSize * 0.78,
                ]}
              />
            )}
            <meshStandardMaterial
              color="#d8d2c6"
              emissive="#8a7358"
              emissiveIntensity={0.12}
              metalness={0.15}
              roughness={0.4}
              depthTest={false}
            />
          </mesh>
        ))
      : null;

  return (
    <>
      <group
        ref={groupRef}
        position={activePosition}
        rotation={rotation}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {content}
        {outline}
        {resizeHandles}
      </group>

      {isSelected ? (
        <TransformControls
          object={groupRef}
          mode={controlMode}
          space={controlMode === 'rotate' ? 'local' : 'world'}
          showX={controlMode !== 'rotate'}
          showY={controlMode === 'rotate'}
          showZ={controlMode !== 'rotate'}
          rotationSnap={controlMode === 'rotate' ? Math.PI / 24 : undefined}
          onDraggingChanged={(event) => {
            setObjectTransforming(event.value);
          }}
          onMouseUp={handleObjectChange}
          onTouchEnd={handleObjectChange}
        />
      ) : null}
    </>
  );
};

export default React.memo(Furniture);
