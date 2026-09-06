import React, { useState } from 'react';
import useStore from '../store/useStore';
import { OBJECT_CATALOG, OBJECT_GROUPS, getObjectGroupLabel, getObjectLabel } from '../lib/objectCatalog';
import { buildDesignRoom, DESIGN_ROOMS } from '../lib/designRooms';
import { getBrowserLocale, localizeText, t } from '../lib/i18n';
import './DesignLibrary.css';

export default function Sidebar({ onOpenRoomPlanner, isMobile = false, onClose }) {
  const addObject = useStore(state=>state.addObject);
  const replaceObjects = useStore(state=>state.replaceObjects);
  const [query,setQuery] = useState('');
  const [group,setGroup] = useState('all');
  const locale = getBrowserLocale();
  const items = OBJECT_CATALOG.filter(item => (group==='all'||group===item.group) &&
    [getObjectLabel(item.id,locale),item.reference?.product,item.reference?.brand].join(' ').toLowerCase().includes(query.toLowerCase()));
  function openRoom(id) {
    if (useStore.getState().objects.length && !window.confirm(locale==='ko'?'현재 배치를 예시 공간으로 바꿀까요? 되돌리기로 복원할 수 있습니다.':'Replace this layout with the example room? Undo restores your layout.')) return;
    replaceObjects(buildDesignRoom(id));
    useStore.getState().selectObject(null);
    if(isMobile) onClose?.();
  }
  return <aside className={'design-library '+(isMobile?'mobile':'')}>
    <header className="library-heading"><div><small>REFERENCE COLLECTION / 01</small><h2>{locale==='ko'?'가구 라이브러리':'Object library'}</h2></div>{isMobile&&<button onClick={onClose} aria-label={t('ui_close',locale)}>✕</button>}</header>
    <p className="library-notice">{locale==='ko'?'실존 제품 19종을 Blender로 새로 제작했습니다. 사진이 아닌 실제 3D 모델을 배치해 보세요.':'19 reference-inspired Blender models. Arrange the actual 3D objects shown below.'}</p>
    <div className="room-samples"><small>{locale==='ko'?'예시 공간으로 시작':'START WITH A ROOM'}</small>{DESIGN_ROOMS.map(room=><button key={room.id} onClick={()=>openRoom(room.id)}>{localizeText(room.label,locale)} <span>↗</span></button>)}</div>
    <label className="library-search"><span>{locale==='ko'?'가구·제품 검색':'Search objects'}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="KIVIK, 소파, LG…" /></label>
    <nav className="library-filters" aria-label={locale==='ko'?'카테고리':'Categories'}>
      {[{id:'all'},...OBJECT_GROUPS].map(item=><button key={item.id} aria-pressed={group===item.id} onClick={()=>setGroup(item.id)}>{item.id==='all'?(locale==='ko'?'전체':'All'):getObjectGroupLabel(item.id,locale)}</button>)}
    </nav>
    <div className="library-products">{items.map(item=><button className={'product-card '+(item.reference?'':'structure-card')} key={item.id} onClick={()=>item.planner?onOpenRoomPlanner():addObject(item.id)}>
      {item.reference?<img loading="lazy" src={import.meta.env.BASE_URL+'thumbnails/'+item.id+'.png'} alt="" width={512} height={512}/>:<div className="structure-glyph">{item.id==='room'?'⌂':item.id==='door'?'▯':'▱'}</div>}
      <div className="product-copy"><small>{item.reference?.brand??(locale==='ko'?'공간 구성':'ARCHITECTURE')}</small><strong>{item.reference?.product??getObjectLabel(item.id,locale)}</strong><span>{getObjectLabel(item.id,locale)}{item.reference?' · +':''}</span><em>{item.planner?t('ui_preset_layouts',locale):item.dimensions.map(v=>Math.round(v*1000)).join(' × ')+' mm'}</em></div>
    </button>)}</div>
    {!items.length&&<p className="library-notice">{locale==='ko'?'검색 결과가 없습니다.':'No matching objects.'}</p>}
    <footer className="library-notice">{locale==='ko'?'비공식 디자인 참고 모델 · W × H × D. 세부 형상·재질은 제작 추정이며 실제 시공·설치 자료가 아닙니다.':'Unofficial reference models · W × H × D. Details and materials are artistic estimates, not installation documentation.'}</footer>
  </aside>;
}
