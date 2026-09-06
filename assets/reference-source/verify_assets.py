"""Inspect exported GLB bytes independently of Blender; produce manifest + QA sheet.

Run with the bundled Python (NumPy/Pillow). This script does not edit source models.
Bounds use every binary POSITION transformed through the actual glTF hierarchy.
"""
from pathlib import Path
import json
import math
import struct
import hashlib
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser(description='Verify existing GLBs without changing them; write a new report directory')
parser.add_argument('--assets', type=Path, required=True)
parser.add_argument('--reports', type=Path, required=True)
parser.add_argument('--font', type=Path, help='Optional local TrueType font for the contact sheet')
args = parser.parse_args()
ROOT = args.assets.resolve()
REPORTS = args.reports.resolve()
if REPORTS == ROOT or REPORTS.exists():
    raise ValueError('Reports must be a NEW directory, not the asset source directory')
REPORTS.mkdir(parents=True)

REQUIRED = ['sofa','bed','chair','table','desk','tv','cabinet','wardrobe','refrigerator','washingMachine','sink','cooktop','bathtub','toilet','shower']
OPTIONAL = ['armchair','floorLamp','tableLamp','pendantLamp']
REFERENCES = {
 'sofa': ('IKEA','KIVIK 3-seat sofa','594.405.92',[2.28,.83,.95],'https://www.ikea.com/kr/ko/p/kivik-3-seat-sofa-tibbleby-beige-grey-s59440592/','#a3967f'),
 'bed': ('IKEA','MALM high bed 150x200','890.052.64',[1.66,1,2.09],'https://www.ikea.com/kr/en/p/malm-bed-frame-high-white-s89005264/','#e9e8e3'),
 'chair': ('IKEA','LISABO ash chair','804.572.36',[.46,.8,.51],'https://www.ikea.com/kr/ko/p/lisabo-chair-ash-80457236/','#c2a275'),
 'table': ('IKEA','LISABO ash table','803.657.17',[1.4,.74,.78],'https://www.ikea.com/kr/ko/p/lisabo-table-ash-veneer-80365717/','#c2a275'),
 'desk': ('IKEA','MICKE desk','803.542.76',[1.05,.75,.5],'https://www.ikea.com/kr/ko/p/micke-desk-white-80354276/','#e9e8e3'),
 'tv': ('Samsung','DU8000 55 inch with stands','UA55DU8000UXTW',[1.2321,.7488,.2263],'https://www.samsung.com/levant/tvs/uhd-4k-tv/du8000-55-inch-crystal-uhd-4k-tizen-os-smart-tv-ua55du8000uxtw/','#1b2227'),
 'cabinet': ('IKEA','MALM chest of 4 drawers','203.546.46',[.8,1,.48],'https://www.ikea.com/kr/ko/p/malm-chest-of-4-drawers-white-20354646/','#e9e8e3'),
 'wardrobe': ('IKEA','PAX/FORSAND wardrobe','095.006.49',[1,2.364,.6],'https://www.ikea.com/no/en/p/pax-forsand-wardrobe-white-white-s09500649/','#e9e8e3'),
 'refrigerator': ('LG','B502S33 top freezer refrigerator','B502S33',[.78,1.8,.73],'https://www.lge.co.kr/business/refrigerators/b502s33','#9ca4a8'),
 'washingMachine': ('LG','F6V1010WTSE front loader','F6V1010WTSE',[.6,.85,.565],'https://www.lg.com/uk/washing-machines/f6v1010wtse/','#e9e8e3'),
 'sink': ('IKEA','SUNNERSTA mini-kitchen with LAGAN','791.396.88',[1.12,1.39,.56],'https://www.ikea.com/gb/en/p/sunnersta-mini-kitchen-s79139688/','#e9e8e3'),
 'cooktop': ('IKEA','MATMASSIG induction hob IKEA 300','104.670.93',[.59,.049,.52],'https://www.ikea.com/de/en/p/matmaessig-induction-hob-ikea-300-black-10467093/','#171c20'),
 'bathtub': ('KOHLER','Evok 2.0 Seamless Oval 1700','25165A-0',[1.7,.61,.75],'https://kohler.co.nz/content/KOHLER_NZ_Catalogue_Apr25_eBook.pdf','#f2f2ed'),
 'toilet': ('Daelim Bath','CC-720N two-piece toilet','CC-720N',[.42,.74,.72],'https://www.daelimbath.com/upload/product/CC-720N_do.pdf','#f2f2ed'),
 'shower': ('hansgrohe + custom enclosure','Crometta E 240 in custom shower zone','27271000',[.9,2.35,.9],'https://www.hansgrohe.co.uk/articledetail-crometta-e-showerpipe-240-1jet-with-thermostatic-shower-mixer-27271000','#bacbd0'),
 'armchair': ('IKEA','POANG bentwood armchair','896.252.59',[.68,1,.82],'https://www.ikea.com/kr/ko/p/poaeng-armchair-black-kelinge-grey-blue-s89625259/','#768f9c'),
 'floorLamp': ('IKEA','LAUTERS ash floor lamp','804.050.54',[.62,1.51,.62],'https://www.ikea.com/kr/ko/p/lauters-floor-lamp-ash-white-80405054/','#ddd7c8'),
 'tableLamp': ('IKEA','FADO opal table lamp','302.838.99',[.25,.24,.25],'https://www.ikea.com/kr/ko/p/fado-table-lamp-white-30283899/','#eeebe0'),
 'pendantLamp': ('IKEA','SINNERLIG bamboo pendant','503.421.95',[.5,.54,.5],'https://www.ikea.com/kr/ko/p/sinnerlig-pendant-lamp-bamboo-handmade-50342195/','#c2a275'),
}
NOTES = {
 'sofa': ['Seat and back cushion profiles, seams, bevels and woven shader are authored estimates.'],
 'bed': ['Published dimensions describe the frame, not the 1.50 x 2.00 m mattress.', 'Mattress, pillows and duvet are separate artistic staging; their thickness and folds are not IKEA specifications.'],
 'cabinet': ['Drawers translate +Z by 0.27 m; do not rotate them like doors.'],
 'wardrobe': ['This Norway SKU has 2 doors, 3 shelves, 1 rail; handles are sold separately and not invented here.', 'Published height is 2.364 m, not the rounded 2.36 m catalog name.'],
 'refrigerator': ['Exterior alloy composition and PBR roughness are not manufacturer measurements.', 'Interior shelf positions and bins are illustrative; no cooling/installation simulation.'],
 'washingMachine': ['Door-included depth follows this specific UK SKU. Interior drum detail is illustrative.', 'Source notes 1.10 m depth with a 90 degree open door; the modeled hinge travel is an illustrative animation, not installation clearance certification.'],
 'sink': ['1.39 m is the rear hanging-rail height; worktop height and basin internals are estimates.', 'The referenced SUNNERSTA has an open frame and no cabinet doors.'],
 'cooktop': ['0.049 m includes the recessed body. Built-in placement should put the glass near worktop height, not the entire body above it.', 'Published zone diameters: front-left .210 m, front-right .145 m, rear .180 m each.'],
 'bathtub': ['Official catalog printed page 053. Acrylic, not porcelain.', 'Outer dimensions and internal .410 m depth/.025 m rim/.1.127 m base length inform the model; curves are reconstructed, not CAD.'],
 'toilet': ['Dimensions from the official one-page drawing. Side flush lever, separate tank and resin seat are modeled.', 'Hidden trap plumbing omitted; this is not a plumbing-installation model.'],
 'shower': ['IMPORTANT: .90 x .90 x 2.35 m is our own shower enclosure design, NOT a hansgrohe product dimension.', 'Referenced fixture: mixer width .295 m, head .240 x .240 m, wall-to-head front .470 m, mixer-to-top 1.201 m.', 'Mixer installed at floor +1.100 m (artistic choice), yielding a fixture top near +2.301 m. Hose shape and glass enclosure are estimated.'],
 'floorLamp': ['The published .620 m base diameter is a conservative occupancy envelope, not a measured axis-aligned triangular-leg bound.', 'Tripod frame and light level are a reference-inspired reconstruction; illumination is artistic, not photometric data.'],
 'tableLamp': ['Power cable excluded from dimensions and mesh. Glow is illustrative, not measured photometry.'],
 'pendantLamp': ['Published body height .540 m excludes its 1.100 m cord.', 'mount_ceiling_anchor is at the top of the body. Cord/drop is a separate placement parameter.', 'Bamboo strip count, weave topology and bulb are artistic estimates.'],
}

def load_glb(path):
    raw=path.read_bytes()
    magic, version, length=struct.unpack_from('<III',raw,0)
    assert magic==0x46546C67 and version==2 and length==len(raw), path.name
    chunks={}; offset=12
    while offset<len(raw):
        size,kind=struct.unpack_from('<II',raw,offset)
        chunks[kind]=raw[offset+8:offset+8+size]
        offset+=8+size
    return raw,json.loads(chunks[0x4E4F534A]),chunks[0x004E4942]

def accessor(doc,binary,index):
    acc=doc['accessors'][index]
    assert not acc.get('sparse'), 'Sparse accessors require explicit support'
    view=doc['bufferViews'][acc['bufferView']]
    types={5126:'<f4',5125:'<u4',5123:'<u2',5122:'<i2',5121:'u1',5120:'i1'}
    width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[acc['type']]
    dtype=np.dtype(types[acc['componentType']])
    offset=view.get('byteOffset',0)+acc.get('byteOffset',0)
    stride=view.get('byteStride',width*dtype.itemsize)
    end=offset+(acc['count']-1)*stride+width*dtype.itemsize
    assert end <= view.get('byteOffset',0)+view['byteLength'] <= len(binary)
    return np.ndarray((acc['count'],width),dtype=dtype,buffer=binary,offset=offset,strides=(stride,dtype.itemsize))

def matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix']).reshape((4,4),order='F')
    x,y,z,w=node.get('rotation',[0,0,0,1])
    rot=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])
    result=np.eye(4)
    result[:3,:3]=rot @ np.diag(node.get('scale',[1,1,1]))
    result[:3,3]=node.get('translation',[0,0,0])
    return result

def inspect(kind):
    path=ROOT/(kind+'.glb')
    raw,doc,binary=load_glb(path)
    positions=[]; pivots=[]; triangles=0; material_names=[]; zero_area=0
    seen=set()
    def visit(index,parent):
        nonlocal triangles,zero_area
        assert index not in seen, 'Duplicate node/cyclic tree'
        seen.add(index)
        node=doc['nodes'][index]
        transform=parent @ matrix(node)
        assert np.isfinite(transform).all()
        extra=node.get('extras',{})
        if extra.get('motion'):
            assert np.allclose(matrix(node)[:3,:3],np.eye(3)), (kind,'nonidentity local pivot basis')
            assert np.allclose(transform[:3,:3],np.eye(3)), (kind,'nonidentity ancestor pivot basis')
            pivots.append({'node':node['name'],'motion':extra['motion'],'axis':extra.get('gltfAxis'),'openAmount':extra.get('openAmount'), 'restTranslation':node.get('translation',[0,0,0]), 'worldPosition':transform[:3,3].round(7).tolist()})
        if 'mesh' in node:
            for primitive in doc['meshes'][node['mesh']]['primitives']:
                assert primitive.get('mode',4)==4
                p=accessor(doc,binary,primitive['attributes']['POSITION'])
                assert np.isfinite(p).all()
                world=np.column_stack([p,np.ones(len(p))]) @ transform.T
                positions.append(world[:,:3])
                idx=accessor(doc,binary,primitive['indices']).reshape(-1) if 'indices' in primitive else np.arange(len(p))
                assert len(idx)%3==0 and idx.max()<len(p)
                triangles+=len(idx)//3
                tri=world[idx].reshape((-1,3,4))[:,:,:3]
                cross=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
                zero_area+=int(np.count_nonzero(np.linalg.norm(cross,axis=1)<1e-12))
                for attribute in ('NORMAL','TEXCOORD_0'):
                    if attribute in primitive['attributes']:
                        values=accessor(doc,binary,primitive['attributes'][attribute])
                        assert len(values)==len(p) and np.isfinite(values).all()
        for child in node.get('children',[]): visit(child,transform)
    for node in doc['scenes'][doc.get('scene',0)]['nodes']: visit(node,np.eye(4))
    points=np.concatenate(positions)
    low,high=points.min(axis=0),points.max(axis=0)
    measured=high-low
    manufacturer,name,sku,expected,url,color=REFERENCES[kind]
    assert np.allclose(measured,expected,rtol=0,atol=.00001),(kind,measured,expected)
    assert abs(low[1])<.00001 and abs(low[0]+high[0])<.00001 and abs(low[2]+high[2])<.00001,(kind,'origin not floor-centred',low,high)
    assert triangles<=80000,(kind,triangles)
    assert len(raw)<=2*1024*1024,(kind,len(raw))
    assert all('uri' not in image for image in doc.get('images',[])), 'External image dependency'
    tint=[]
    material_settings=[]
    for mat in doc.get('materials',[]):
        material_names.append(mat.get('name',''))
        if mat.get('name','').startswith('TINT_'): tint.append(mat['name'])
        pbr=mat.get('pbrMetallicRoughness',{})
        material_settings.append({'name':mat.get('name'),'baseColorFactor':pbr.get('baseColorFactor',[1,1,1,1]),'metallicFactor':pbr.get('metallicFactor',1),'roughnessFactor':pbr.get('roughnessFactor',1),'textured':'baseColorTexture' in pbr})
    png=ROOT/'renders'/(kind+'.png')
    with Image.open(png) as img: assert img.size==(512,512)
    root_node=next(n for n in doc['nodes'] if n.get('name')==kind+'_root')
    assert np.allclose(matrix(root_node),np.eye(4)), (kind,'root must be identity')
    # Check actual child geometry moved around the exported local axes.
    for motion in pivots:
        if motion['motion']=='fixed': continue
        node=next(n for n in doc['nodes'] if n.get('name')==motion['node'])
        local_points=[]
        def collect(index,parent):
            child=doc['nodes'][index]
            t=parent @ matrix(child)
            if 'mesh' in child:
                for primitive in doc['meshes'][child['mesh']]['primitives']:
                    p=accessor(doc,binary,primitive['attributes']['POSITION'])
                    local_points.append((np.column_stack([p,np.ones(len(p))]) @ t.T)[:,:3])
            for grandchild in child.get('children',[]): collect(grandchild,t)
        for index in node.get('children',[]): collect(index,np.eye(4))
        points=np.concatenate(local_points)
        before=points.mean(axis=0)
        after=before.copy()
        axis='XYZ'.index(motion['axis'])
        if motion['motion']=='translation': after[axis]+=motion['openAmount']
        else:
            angle=motion['openAmount']; quat=[0,0,0,math.cos(angle/2)]; quat[axis]=math.sin(angle/2)
            after=matrix({'rotation':quat})[:3,:3] @ before
        delta=after-before
        if motion['node'].startswith(('pivot_door','pivot_drawer')): assert delta[2]>.05,(kind,motion,'must open toward front +Z',delta)
        if motion['node']=='pivot_lid': assert delta[1]>.05,(kind,'lid must lift toward +Y',delta)
        motion['verifiedOpenCentreDelta']=delta.round(7).tolist()
    return {'type':kind,'model':kind+'.glb','thumbnail':'renders/'+kind+'.png','referenceManufacturer':manufacturer,'referenceProduct':name,'referenceSku':sku,'referenceUrl':url,'referenceOnly':True,'measuredByAuthor':False,'dimensions':expected,'measuredGlbDimensions':measured.round(7).tolist(),'bounds':{'min':low.round(7).tolist(),'max':high.round(7).tolist()},'defaultColor':color,'tintMaterials':tint,'materials':material_settings,'pivots':pivots,'triangles':triangles,'meshNodes':len(positions),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'embeddedImages':len(doc.get('images',[])),'degenerateTriangles':zero_area,'blenderCalibrationScaleXYZ':root_node.get('extras',{}).get('calibrationScaleXYZ'),'dimensionsSource':'published product exterior dimensions' if kind not in {'shower','floorLamp'} else 'custom shower enclosure; fixture dimensions separate' if kind=='shower' else 'published diameter occupancy envelope','estimatedDetails':NOTES.get(kind,[])+['Panel thicknesses, bevel radii, fabric folds/UVs and all PBR parameters are reconstructed estimates, not official CAD or material measurements.']}

assets=[inspect(kind) for kind in REQUIRED+OPTIONAL]
assert all(kind in {asset['type'] for asset in assets} for kind in REQUIRED)
manifest={'schemaVersion':1,'createdWith':'Blender 4.5.11 LTS reference reconstruction; source release built via reviewed local Blender MCP; transport not attested by this verifier','assetNotice':'Unofficial, newly authored visual reconstructions inspired by publicly documented products. Not official CAD, not manufacturer-endorsed; no product photos redistributed.','units':'metres','axes':{'gltf':['width X','height Y','depth Z'],'front':'+Z','origin':'floor-centre, closed/rest state','blender':'X width, Y depth, Z height; front -Y'},'animationContract':{'rotation':'Set pivot.rotation[axis.toLowerCase()] = openAmount * progress; units radians. Rest rotations are identity.','translation':'Set pivot.position[axis.toLowerCase()] = restTranslation[axisIndex] + openAmount * progress; units metres.','fixed':'Anchor only; do not animate.','progress':'0 closed, 1 open. Preserve all child transforms.','tint':'Preserve authored materials by default. Only TINT_ materials are color-customizable; metal/glass/wood retain identity.'},'verification':{'binaryGlbBounds':True,'positionAttributeFinite':True,'indexRangesValid':True,'yUpFloorOrigin':True,'dimensionsToleranceMetres':.00001,'embeddedTexturesOnly':True,'maxTrianglesPerAsset':80000,'maxBytesPerAsset':2097152,'manufacturerDimensionsVerifiedBy':'work/interior-references.md official-page/PDF research; reconstructed geometry verified separately','notVerified':['Official CAD equivalence','Manufacturing/structural/plumbing/electrical safety','Real-world assembly/clearance fit','Color calibration of physical materials']},'assets':assets}
(REPORTS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(REPORTS/'catalog.json').write_text(json.dumps({'axes':'W,H,D; glTF Y-up, front +Z, floor-centre origin','assets':[{k:a[k] for k in ('type','model','thumbnail','dimensions','defaultColor','referenceManufacturer','referenceProduct','referenceSku','referenceUrl','referenceOnly','pivots','tintMaterials')} for a in assets]},ensure_ascii=False,indent=2)+'\n')
(REPORTS/'validation.json').write_text(json.dumps({'passed':True,'assets':[{'type':a['type'],'dimensions':a['measuredGlbDimensions'],'triangles':a['triangles'],'bytes':a['bytes'],'degenerateTriangles':a['degenerateTriangles'],'pivotCount':len(a['pivots'])} for a in assets]},indent=2)+'\n')

# Technical QA contact sheet made from our own Blender renders, not external images.
def local_font(size):
    if args.font:
        return ImageFont.truetype(str(args.font), size)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()
title_font=local_font(26)
label_font=local_font(15)
small_font=local_font(12)
cols=5; tile=256; label_h=69; rows=math.ceil(len(assets)/cols)
sheet=Image.new('RGB',(cols*tile,78+rows*(tile+label_h)),(30,34,34))
draw=ImageDraw.Draw(sheet)
draw.text((22,15),'INTERIOR / REFERENCE COLLECTION',font=title_font,fill=(240,235,221))
draw.text((23,51),'19 authored Blender MCP assets | 15 required + 4 optional | independent GLB scale validation',font=small_font,fill=(174,183,177))
for i,asset in enumerate(assets):
    x=(i%cols)*tile; y=78+(i//cols)*(tile+label_h)
    with Image.open(ROOT/asset['thumbnail']) as img: sheet.paste(img.convert('RGB').resize((tile,tile),Image.Resampling.LANCZOS),(x,y))
    draw.text((x+12,y+tile+9),asset['type']+' / '+asset['referenceManufacturer'],font=label_font,fill=(236,230,216))
    draw.text((x+12,y+tile+31),' x '.join(f'{v:g}' for v in asset['dimensions'])+' m  [W,H,D]',font=small_font,fill=(174,183,177))
    draw.text((x+12,y+tile+49),f"{asset['triangles']:,} tris | {asset['bytes']/1024:.0f} KiB",font=small_font,fill=(174,183,177))
sheet.save(REPORTS/'contact-sheet.png')
print(json.dumps({'passed':True,'count':len(assets),'required':len(REQUIRED),'triangles':sum(a['triangles'] for a in assets),'totalGlbBytes':sum(a['bytes'] for a in assets),'maximumBytes':max(a['bytes'] for a in assets),'manifest':str(REPORTS/'manifest.json')},indent=2))
