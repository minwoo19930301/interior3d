import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { TransformControls, RoundedBox } from '@react-three/drei';
import useStore from '../store/useStore';
import { clampDimensions, getObjectDefinition, roundNumber } from '../lib/objectCatalog';
import {
  getWoodTexture,
  getFabricTexture,
  getBrushedMetalTexture,
  getTileTexture,
  getScreenTexture,
} from '../lib/textures';

const BRASS = '#b08d57';
const STEEL_BLACK = '#232323';

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
  const doorLeafMaterial = { map: getWoodTexture('warm'), roughness: 0.6 };
  const oakMaterial = { map: getWoodTexture('warm'), roughness: 0.58 };

  return (
    <group>
      <BoxPart size={[width, shell, depth]} position={[0, shell / 2, 0]} color="#6f5a4b" material={oakMaterial} />
      <BoxPart size={[width, shell, depth]} position={[0, height - shell / 2, 0]} color="#6f5a4b" material={oakMaterial} />
      <BoxPart size={[shell, height, depth]} position={[-width / 2 + shell / 2, height / 2, 0]} color={color} material={oakMaterial} />
      <BoxPart size={[shell, height, depth]} position={[width / 2 - shell / 2, height / 2, 0]} color={color} material={oakMaterial} />
      <BoxPart size={[interiorWidth, interiorHeight, shell]} position={[0, height / 2, -depth / 2 + shell / 2]} color="#5f4d40" />
      {type === 'wardrobe' ? (
        <>
          <BoxPart size={[interiorWidth * 0.92, shell, interiorDepth * 0.92]} position={[0, height * 0.56, 0]} color="#6b5647" />
          <CylinderPart radiusTop={0.014} height={interiorWidth * 0.82} position={[0, height * 0.78, -depth * 0.12]} rotation={[0, 0, Math.PI / 2]} color={BRASS} material={{ map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 }} />
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
        material={doorLeafMaterial}
        radius={0.008}
      />
      <HingedPanel
        width={doorWidth}
        height={height - shell * 1.2}
        depth={panelDepth}
        center={[width / 4 + doorGap / 2, height / 2, depth / 2 + panelDepth / 2]}
        hinge="right"
        angle={-openAngle}
        color="#a18b77"
        material={doorLeafMaterial}
        radius={0.008}
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
  const woodDark = { map: getWoodTexture('dark'), roughness: 0.65 };
  const boucleMaterial = { map: getFabricTexture('boucle'), roughness: 0.95, metalness: 0 };

  return (
    <group>
      <BoxPart size={[width, baseHeight, depth * 0.9]} position={[0, baseHeight / 2, 0]} color="#4a3324" material={woodDark} />
      <BoxPart size={[width * 0.86, seatHeight, depth * 0.64]} position={[0, baseHeight + seatHeight / 2, 0.02]} color={color} radius={0.06} material={boucleMaterial} />
      {[-1, 0, 1].map((index) => (
        <BoxPart
          key={index}
          size={[cushionWidth, seatHeight * 0.92, depth * 0.58]}
          position={[index * (cushionWidth + cushionGap), seatTop - seatHeight * 0.04, 0.03]}
          color={color}
          radius={0.06}
          material={boucleMaterial}
        />
      ))}
      <BoxPart size={[width * 0.9, backHeight, depth * 0.18]} position={[0, seatTop + backHeight / 2 - 0.02, -depth / 2 + depth * 0.12]} color={color} radius={0.06} material={boucleMaterial} />
      <BoxPart size={[armWidth, height * 0.54, depth * 0.82]} position={[-width / 2 + armWidth / 2, height * 0.27, 0]} color={color} radius={0.05} material={boucleMaterial} />
      <BoxPart size={[armWidth, height * 0.54, depth * 0.82]} position={[width / 2 - armWidth / 2, height * 0.27, 0]} color={color} radius={0.05} material={boucleMaterial} />
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
          position={[0, 0.01, 0]}
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

  if (type === 'table') {
    const topThickness = Math.max(0.05, height * 0.08);
    const legRadiusTop = 0.03;
    const legRadiusBottom = 0.022;
    const legHeight = height - topThickness;
    const offsetX = width / 2 - legRadiusBottom - 0.05;
    const offsetZ = depth / 2 - legRadiusBottom - 0.05;
    const repeatKey = `${roundNumber(width / 0.9)}x${roundNumber(depth / 0.9)}`;
    const topTexture = getWoodTexture('warm', repeatKey);
    topTexture.repeat.set(width / 0.9, depth / 0.9);
    const steelLegMaterial = { metalness: 0.6, roughness: 0.6 };

    return (
      <group>
        <BoxPart
          size={[width, topThickness, depth]}
          position={[0, legHeight + topThickness / 2, 0]}
          color={color}
          radius={0.015}
          material={{ map: topTexture, roughness: 0.55 }}
        />
        {[-offsetX, offsetX].flatMap((x) =>
          [-offsetZ, offsetZ].map((z) => (
            <CylinderPart
              key={`${x}-${z}`}
              radiusTop={legRadiusTop}
              radiusBottom={legRadiusBottom}
              height={legHeight}
              position={[x, legHeight / 2, z]}
              color={STEEL_BLACK}
              material={steelLegMaterial}
            />
          )),
        )}
      </group>
    );
  }

  if (type === 'desk') {
    const topThickness = Math.max(0.05, height * 0.08);
    const legRadiusTop = 0.03;
    const legRadiusBottom = 0.022;
    const legHeight = height - topThickness;
    const repeatKey = `${roundNumber(width / 0.9)}x${roundNumber(depth / 0.9)}`;
    const topTexture = getWoodTexture('warm', repeatKey);
    topTexture.repeat.set(width / 0.9, depth / 0.9);
    const steelLegMaterial = { metalness: 0.6, roughness: 0.6 };
    const brassAccent = { map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 };

    return (
      <group>
        <BoxPart
          size={[width, topThickness, depth]}
          position={[0, legHeight + topThickness / 2, 0]}
          color={color}
          radius={0.015}
          material={{ map: topTexture, roughness: 0.55 }}
        />
        <BoxPart size={[width * 0.28, legHeight, depth * 0.6]} position={[width * 0.26, legHeight / 2, 0]} color={STEEL_BLACK} material={steelLegMaterial} />
        <BoxPart size={[width, legHeight * 0.4, 0.04]} position={[0, legHeight * 0.34, -depth / 2 + 0.02]} color={STEEL_BLACK} material={steelLegMaterial} />
        <CylinderPart
          radiusTop={0.012}
          height={0.03}
          position={[width * 0.14, legHeight * 0.34, depth / 2 - 0.005]}
          rotation={[Math.PI / 2, 0, 0]}
          color={BRASS}
          material={brassAccent}
        />
        <CylinderPart
          radiusTop={0.012}
          height={0.03}
          position={[width * 0.38, legHeight * 0.34, depth / 2 - 0.005]}
          rotation={[Math.PI / 2, 0, 0]}
          color={BRASS}
          material={brassAccent}
        />
        {[-width / 2 + legRadiusBottom, width / 2 - legRadiusBottom].map((x) => (
          <CylinderPart
            key={x}
            radiusTop={legRadiusTop}
            radiusBottom={legRadiusBottom}
            height={legHeight}
            position={[x, legHeight / 2, depth / 2 - legRadiusBottom]}
            color={STEEL_BLACK}
            material={steelLegMaterial}
          />
        ))}
        <CylinderPart
          radiusTop={legRadiusTop}
          radiusBottom={legRadiusBottom}
          height={legHeight}
          position={[-width / 2 + legRadiusBottom, legHeight / 2, -depth / 2 + legRadiusBottom]}
          color={STEEL_BLACK}
          material={steelLegMaterial}
        />
      </group>
    );
  }

  if (type === 'chair') {
    const seatThickness = Math.max(0.04, height * 0.07);
    const seatHeight = height * 0.46;
    const backHeight = Math.max(height * 0.38, 0.28);
    const legRadiusTop = Math.min(0.028, Math.min(width, depth) * 0.05);
    const legRadiusBottom = legRadiusTop * 0.75;
    const offsetX = width / 2 - legRadiusBottom - 0.03;
    const offsetZ = depth / 2 - legRadiusBottom - 0.03;
    const fabricMaterial = { map: getFabricTexture('linen'), roughness: 0.85, metalness: 0 };
    const steelLegMaterial = { metalness: 0.6, roughness: 0.6 };

    return (
      <group>
        <BoxPart size={[width, seatThickness, depth * 0.88]} position={[0, seatHeight, 0]} color={color} radius={0.04} material={fabricMaterial} />
        <BoxPart size={[width * 0.92, backHeight, seatThickness]} position={[0, seatHeight + backHeight / 2, -depth / 2 + seatThickness / 2]} color={color} radius={0.04} material={fabricMaterial} />
        {[-offsetX, offsetX].flatMap((x) =>
          [-offsetZ, offsetZ].map((z) => (
            <CylinderPart
              key={`${x}-${z}`}
              radiusTop={legRadiusTop}
              radiusBottom={legRadiusBottom}
              height={seatHeight}
              position={[x, seatHeight / 2, z]}
              color={STEEL_BLACK}
              material={steelLegMaterial}
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
    const woodOak = { map: getWoodTexture('warm'), roughness: 0.58 };
    const linenMaterial = { map: getFabricTexture('linen'), roughness: 0.85, metalness: 0 };
    const blanketDepth = depth * 0.3;

    return (
      <group>
        <BoxPart size={[width, frameHeight, depth]} position={[0, frameHeight / 2, 0]} color={color} material={woodOak} />
        <BoxPart size={[width * 0.95, mattressHeight, depth * 0.94]} position={[0, frameHeight + mattressHeight / 2, 0]} color="#f2ede3" radius={0.06} material={linenMaterial} />
        <BoxPart size={[width, height, 0.08]} position={[0, height / 2, -depth / 2 + 0.04]} color="#5b473f" material={woodOak} />
        <BoxPart size={[width * 0.28, 0.1, depth * 0.18]} position={[-width * 0.18, mattressTop - 0.02, -depth * 0.28]} color="#faf7f0" radius={0.06} material={linenMaterial} />
        <BoxPart size={[width * 0.28, 0.1, depth * 0.18]} position={[width * 0.18, mattressTop - 0.02, -depth * 0.28]} color="#faf7f0" radius={0.06} material={linenMaterial} />
        <BoxPart
          size={[width * 0.93, 0.04, blanketDepth]}
          position={[0, mattressTop + 0.01, depth * 0.28]}
          color={color}
          radius={0.03}
          material={linenMaterial}
        />
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
    const brassAccent = { map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 };

    return (
      <group>
        <BoxPart size={[width, screenHeight, depth]} position={[0, height - screenHeight / 2, 0]} color="#0a0a0c" material={{ metalness: 0.5, roughness: 0.35 }} />
        <BoxPart
          size={[width * 0.96, screenHeight * 0.9, depth / 2]}
          position={[0, height - screenHeight / 2, depth * 0.26]}
          color="#12161d"
          material={{
            emissive: '#3a5578',
            emissiveMap: getScreenTexture(),
            emissiveIntensity: 0.85,
            roughness: 0.08,
            metalness: 0.1,
          }}
        />
        <CylinderPart radiusTop={0.04} height={height * 0.26} position={[0, height * 0.18, 0]} color={BRASS} material={brassAccent} />
        <BoxPart size={[width * 0.42, baseHeight, depth * 3.2]} position={[0, baseHeight / 2, depth * 0.1]} color={BRASS} material={brassAccent} />
      </group>
    );
  }

  if (type === 'refrigerator') {
    const bodyMaterial = { map: getBrushedMetalTexture('steel'), color, metalness: 0.75, roughness: 0.32 };

    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} radius={0.02} material={bodyMaterial} />
        <BoxPart size={[width * 0.46, height * 0.56, 0.02]} position={[-width * 0.24, height * 0.7, depth / 2 + 0.01]} color="#4c5158" />
        <BoxPart size={[width * 0.46, height * 0.32, 0.02]} position={[width * 0.24, height * 0.26, depth / 2 + 0.01]} color="#4c5158" />
        <CylinderPart radiusTop={0.012} height={height * 0.3} position={[-width * 0.02, height * 0.66, depth / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#8e98a3" material={{ metalness: 0.9, roughness: 0.2 }} />
        <CylinderPart radiusTop={0.012} height={height * 0.2} position={[width * 0.14, height * 0.24, depth / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#8e98a3" material={{ metalness: 0.9, roughness: 0.2 }} />
      </group>
    );
  }

  if (type === 'washingMachine') {
    const bodyMaterial = { color, metalness: 0.15, roughness: 0.12 };

    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} radius={0.02} material={bodyMaterial} />
        <CylinderPart radiusTop={Math.min(width, height) * 0.26} height={0.08} position={[0, height * 0.48, depth / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]} color="#4a5665" material={{ metalness: 0.45, roughness: 0.22 }} />
        <CylinderPart radiusTop={Math.min(width, height) * 0.18} height={0.08} position={[0, height * 0.48, depth / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]} color="#90b2cc" material={{ metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.4 }} />
        <BoxPart size={[width * 0.7, height * 0.1, 0.03]} position={[0, height * 0.9, depth / 2 + 0.02]} color="#ced6df" material={{ roughness: 0.1 }} />
      </group>
    );
  }

  if (type === 'sink') {
    const counterHeight = Math.max(0.08, height * 0.12);
    const marbleMaterial = { map: getTileTexture('marble'), roughness: 0.2, metalness: 0 };
    const oakMaterial = { map: getWoodTexture('warm'), roughness: 0.58 };
    const brassAccent = { map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 };

    return (
      <group>
        <BoxPart size={[width, height - counterHeight, depth * 0.9]} position={[0, (height - counterHeight) / 2, 0]} color="#a1826a" material={oakMaterial} />
        <BoxPart size={[width, counterHeight, depth]} position={[0, height - counterHeight / 2, 0]} color={color} material={marbleMaterial} />
        <BoxPart size={[width * 0.5, counterHeight * 0.7, depth * 0.44]} position={[0, height - counterHeight / 2 + 0.01, 0]} color="#59626f" material={{ metalness: 0.85, roughness: 0.25 }} />
        <CylinderPart radiusTop={0.018} height={height * 0.22} position={[0, height + height * 0.06, -depth * 0.12]} color={BRASS} material={brassAccent} />
        <CylinderPart radiusTop={0.014} height={depth * 0.22} position={[0.08, height + height * 0.12, -depth * 0.05]} rotation={[0, 0, Math.PI / 2]} color={BRASS} material={brassAccent} />
      </group>
    );
  }

  if (type === 'cooktop') {
    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} material={{ metalness: 0.2, roughness: 0.06 }} />
        {[-width * 0.22, width * 0.22].flatMap((x) =>
          [-depth * 0.2, depth * 0.2].map((z) => (
            <CylinderPart
              key={`${x}-${z}`}
              radiusTop={Math.min(width, depth) * 0.1}
              height={0.02}
              position={[x, height + 0.01, z]}
              color="#414b58"
              material={{ emissive: '#331a0d', emissiveIntensity: 0.25 }}
            />
          )),
        )}
      </group>
    );
  }

  if (type === 'bathtub') {
    const ceramicMaterial = { map: getTileTexture('ceramic'), roughness: 0.12 };
    const brassAccent = { map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 };

    return (
      <group>
        <BoxPart size={[width, height, depth]} position={[0, height / 2, 0]} color={color} material={ceramicMaterial} />
        <BoxPart size={[width * 0.84, height * 0.58, depth * 0.72]} position={[0, height * 0.56, 0]} color="#f4f1ea" radius={0.04} material={ceramicMaterial} />
        <CylinderPart radiusTop={0.018} height={height * 0.22} position={[width * 0.32, height + height * 0.08, -depth * 0.18]} color={BRASS} material={brassAccent} />
      </group>
    );
  }

  if (type === 'toilet') {
    const baseHeight = height * 0.36;
    const bowlHeight = height * 0.28;
    const tankHeight = height * 0.3;
    const tankDepth = depth * 0.28;
    const ceramicMaterial = { map: getTileTexture('ceramic'), roughness: 0.12 };

    return (
      <group>
        <CylinderPart
          radiusTop={width * 0.18}
          radiusBottom={width * 0.12}
          height={baseHeight}
          position={[0, baseHeight / 2, depth * 0.1]}
          color={color}
          material={ceramicMaterial}
        />
        <CylinderPart
          radiusTop={width * 0.26}
          radiusBottom={width * 0.21}
          height={bowlHeight}
          position={[0, baseHeight + bowlHeight / 2 - 0.02, depth * 0.06]}
          color={color}
          material={ceramicMaterial}
        />
        <CylinderPart
          radiusTop={width * 0.14}
          radiusBottom={width * 0.11}
          height={height * 0.16}
          position={[0, baseHeight + bowlHeight * 0.34, depth * 0.07]}
          color="#f4f1ea"
          material={ceramicMaterial}
        />
        <TorusPart
          radius={width * 0.19}
          tube={height * 0.034}
          position={[0, baseHeight + bowlHeight * 0.6, depth * 0.07]}
          rotation={[Math.PI / 2, 0, 0]}
          color="#f7f4ee"
          material={ceramicMaterial}
        />
        <BoxPart
          size={[width * 0.62, height * 0.035, depth * 0.48]}
          position={[0, baseHeight + bowlHeight * 0.73, depth * 0.03]}
          color="#f6f2ec"
          rotation={[0.12, 0, 0]}
          material={ceramicMaterial}
        />
        <BoxPart
          size={[width * 0.68, tankHeight, tankDepth]}
          position={[0, height - tankHeight / 2, -depth * 0.22]}
          color={color}
          material={ceramicMaterial}
        />
        <BoxPart
          size={[width * 0.66, height * 0.03, tankDepth]}
          position={[0, height - height * 0.015, -depth * 0.22]}
          color="#f4f1ea"
          material={ceramicMaterial}
        />
      </group>
    );
  }

  if (type === 'shower') {
    const glassMaterial = { transparent: true, opacity: 0.2, roughness: 0.03, metalness: 0.05 };
    const brassAccent = { map: getBrushedMetalTexture('brass'), metalness: 0.9, roughness: 0.3 };

    return (
      <group>
        <BoxPart size={[width, 0.05, depth]} position={[0, 0.025, 0]} color="#e4e8ec" material={{ map: getTileTexture('ceramic'), roughness: 0.12 }} />
        <BoxPart size={[0.02, height, depth]} position={[-width / 2 + 0.01, height / 2, 0]} color="#eaf3f8" material={glassMaterial} />
        <BoxPart size={[width, height, 0.02]} position={[0, height / 2, -depth / 2 + 0.01]} color="#eaf3f8" material={glassMaterial} />
        <CylinderPart radiusTop={0.014} height={height * 0.68} position={[width * 0.34, height * 0.64, -depth * 0.28]} color={BRASS} material={brassAccent} />
        <CylinderPart
          radiusTop={0.06}
          radiusBottom={0.06}
          height={0.02}
          position={[width * 0.34, height * 0.96, -depth * 0.2]}
          rotation={[0, 0, Math.PI * 0.18]}
          color={BRASS}
          material={brassAccent}
        />
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
    () => renderFurniture(type, activeDimensions, color, isOpen, swing),
    [type, activeDimensions, color, isOpen, swing],
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
