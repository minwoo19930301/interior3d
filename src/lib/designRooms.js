import { getObjectDefinition } from './objectCatalog.js';

function item(type, x, z, rotation = 0, y = 0, dimensions) {
  const definition = getObjectDefinition(type);
  return { type, position:[x,y,z], rotation:[0,rotation,0], dimensions:dimensions ?? [...definition.dimensions], color:definition.color, isOpen:false };
}

export const DESIGN_ROOMS = [
  { id:'living', label:{ko:'거실 · 다이닝',en:'Living & dining'} },
  { id:'bedroom', label:{ko:'침실 · 작업실',en:'Sleep & work'} },
  { id:'utility', label:{ko:'욕실 · 다용도실',en:'Bath & utility'} },
];

// Original staging layouts, not claimed to be manufacturer's room designs.
// Products retain published sizes. Open front/right walls allow editing.
export function buildDesignRoom(id = 'living') {
  const shell = [
    {...item('floorPanel',0,0,0,0,[7,.08,6]),color:'#d2b38c'},
    {...item('wall',0,-3,0,0,[7,2.65,.1]),color:'#eeeae0'},
    {...item('wall',-3.5,0,0,0,[.1,2.65,6]),color:'#e4e6dd'},
  ];
  if(id === 'bedroom') return [...shell,
    item('bed',-1.7,-1.25),item('wardrobe',1.9,-2.65),
    item('desk',2.55,.3,-Math.PI/2),item('chair',1.65,.3,Math.PI/2),
    item('cabinet',-2.85,1.6),item('tableLamp',-2.85,1.6,0,1),
  ];
  if(id === 'utility') return [
    {...shell[0],color:'#d5d8d3'},shell[1],shell[2],
    item('bathtub',-2.1,-2.3),item('toilet',-.7,-2.45),item('shower',.7,-2.4),
    item('washingMachine',2.75,-2.55),item('refrigerator',2.6,.1,-Math.PI/2),
    item('sink',.65,1.8,Math.PI),
    // A custom worktop supports the hob; 49mm is its full body thickness.
    {...item('cube',-.55,1.8,0,0,[.9,.86,.65]),color:'#d1c3b2'},
    item('cooktop',-.55,1.8,0,.816),
  ];
  return [...shell,
    item('sofa',-1.45,-2.36),
    item('armchair',-2.8,-.8,Math.PI/3),item('floorLamp',.1,-2.6),
    item('cabinet',2.65,-.95,-Math.PI/2),item('cabinet',2.65,-.13,-Math.PI/2),
    item('tv',2.65,-.54,-Math.PI/2,1),
    item('table',-.6,1.65),
    item('pendantLamp',-.6,1.65,0,2.1),
    item('chair',-1.0,.83),item('chair',-.2,.83),
    item('chair',-1.0,2.48,Math.PI),item('chair',-.2,2.48,Math.PI),
  ];
}
