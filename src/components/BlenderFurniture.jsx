import React, { Suspense, useEffect, useMemo } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { createModelInstance, disposeModelInstance, openModel, styleModel } from '../lib/modelInstance';

function ModelPlaceholder({ dimensions, failed = false }) {
  return <group>
    <mesh position={[0, dimensions[1]/2, 0]}>
      <boxGeometry args={dimensions} />
      <meshBasicMaterial color={failed ? '#d55c42' : '#87998c'} wireframe />
    </mesh>
    <Html center position={[0, dimensions[1]+.1, 0]} style={{pointerEvents:'none',whiteSpace:'nowrap',fontSize:12,color:failed?'#b43120':'#36443b',background:'#fffdf5',padding:'6px 9px',borderRadius:4}}>
      {failed ? '모델 로드 실패 · 새로고침해 주세요' : 'Blender 모델 로딩…'}
    </Html>
  </group>;
}

class ModelBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ModelPlaceholder dimensions={this.props.dimensions} failed /> : this.props.children; }
}

function LoadedModel({ type, reference, dimensions, color, defaultColor, isOpen }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/${type}.glb`);
  const instance = useMemo(() => createModelInstance(scene), [scene]);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    styleModel(instance, color, defaultColor);
    openModel(instance, isOpen);
    invalidate();
  }, [instance, color, defaultColor, isOpen, invalidate]);
  useEffect(() => () => disposeModelInstance(instance), [instance]);
  return <group scale={dimensions.map((value,index) => value/reference.dimensions[index])} dispose={null}>
    <primitive object={instance.scene} dispose={null} />
  </group>;
}

export default function BlenderFurniture(props) {
  return <ModelBoundary dimensions={props.dimensions}>
    <Suspense fallback={<ModelPlaceholder dimensions={props.dimensions} />}>
      <LoadedModel {...props} />
    </Suspense>
  </ModelBoundary>;
}
