"""Reference-inspired authored meshes. Execute ONLY through the local Blender MCP.

Set scene['asset_output_dir'] and scene['asset_batch'] before this script.
Use prepare_mcp_build.py to create a path-configured payload for a fresh scene.
All dimensions are metres, Blender front -Y; exported glTF front +Z, Y-up.
Public exterior dimensions are calibrated; internal details are artistic estimates.
"""
import bpy
import math
import random
import json
from mathutils import Vector, Matrix

ROOT = bpy.context.scene.get('asset_output_dir')
if not isinstance(ROOT, str) or not ROOT:
    raise ValueError('Set scene asset_output_dir to a prepared, dedicated output directory')
ROOT = ROOT.rstrip('/\\\\') + '/'
random.seed(8124)
STATE = {'collection': None, 'parent': None}

def material(name, color, roughness=.45, metal=0, texture=None, emission=0):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    if texture:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = texture
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return mat

def procedural_image(name, wood=False):
    existing = bpy.data.images.get(name)
    if existing:
        return existing
    size = 256 if wood else 128
    img = bpy.data.images.new(name, width=size, height=size)
    pixels = []
    for y in range(size):
        for x in range(size):
            u, v = x / size, y / size
            if wood:
                flow = v * 120 + 1.3 * math.sin(u * 2 * math.pi) + .5 * math.sin(u * 6 * math.pi + v * 9)
                grain = .032 * math.sin(flow) + .014 * math.sin(flow * 4) + random.uniform(-.008, .008)
                base = (.73, .57, .35)
            else:
                grain = .022 * math.sin(x * math.pi / 2) * math.cos(y * math.pi / 2) + random.uniform(-.014, .014)
                base = (.64, .58, .48)
            pixels.extend([max(0, min(1, c + grain)) for c in base] + [1])
    img.pixels = pixels
    img.filepath_raw = ROOT + 'textures/' + name + '.png'
    img.file_format = 'PNG'
    img.save()
    img.pack()
    return img

ASH = material('Ash_veneer_procedural', (.72,.54,.31), .38, texture=procedural_image('ash_grain', True))
FABRIC = material('TINT_Tibbleby_woven_fabric', (.65,.59,.49), .91, texture=procedural_image('woven_fabric'))
WHITE = material('TINT_White_lacquer', (.88,.865,.825), .36)
CERAMIC = material('Glazed_porcelain', (.92,.94,.925), .17)
ACRYLIC = material('Gloss_white_acrylic', (.9,.92,.9), .18)
LINEN = material('TINT_Linen_bedding', (.8,.77,.66), .92)
TAUPE = material('TINT_Sage_duvet', (.29,.36,.31), .91)
SEAM = material('Woven_piping', (.41,.365,.29), .9)
BLACK = material('Graphite_polymer', (.015,.019,.022), .42)
DARK = material('Interior_shadow', (.045,.05,.052), .64)
STEEL = material('Brushed_stainless', (.42,.46,.48), .3, .85)
CHROME = material('Polished_chrome', (.6,.63,.67), .13, .95)
GLASS = material('Smoked_glass', (.027,.058,.074), .12, .38)
glass_bsdf=GLASS.node_tree.nodes.get('Principled BSDF')
glass_bsdf.inputs['Base Color'].default_value=(.09,.135,.16,1)
glass_bsdf.inputs['Metallic'].default_value=0
glass_bsdf.inputs['Transmission Weight'].default_value=.55
SCREEN = material('Display_standby_blue', (.018,.045,.069), .18, .16, emission=.22)
RUBBER = material('Rubber_gasket', (.035,.038,.036), .85)
RED = material('Status_indicator', (.48,.015,.008), .25, emission=.5)

def link(obj, name, mat=None, parent=None):
    obj.name = name
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    STATE['collection'].objects.link(obj)
    if mat and obj.type in {'MESH','CURVE'}:
        obj.data.materials.append(mat)
    parent = parent or STATE['parent']
    if parent:
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj

def bevel(obj, width=.008, segments=3):
    mod = obj.modifiers.new('Manufactured_edge_radius', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod = obj.modifiers.new('Corner_normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def box(name, loc, dims, mat=WHITE, radius=.007, parent=None, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    link(obj, name, mat, parent)
    if radius:
        bevel(obj, min(radius, min(dims) * .45), 3)
    if rotation:
        obj.rotation_euler = rotation
    return obj

def mesh(name, verts, faces, mat, parent=None, smooth=True):
    data = bpy.data.meshes.new(name + '_geometry')
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    link(obj, name, mat, parent)
    for face in data.polygons:
        face.use_smooth = smooth
    # Deterministic planar UVs; primitives retain their native UVs.
    uv = data.uv_layers.new(name='UVMap')
    for face in data.polygons:
        for loop in face.loop_indices:
            point = data.vertices[data.loops[loop].vertex_index].co
            uv.data[loop].uv = (point.x * 2, point.y * 2 + point.z)
    return obj

def cylinder(name, a, b, radius, mat=ASH, radius2=None, parent=None, vertices=24):
    a, b = Vector(a), Vector(b)
    vec = b-a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius if radius2 is None else radius2, depth=vec.length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = vec.to_track_quat('Z','Y').to_euler()
    link(obj, name, mat, parent)
    bevel(obj, min(radius*.12, .003), 2)
    return obj

def tube(name, pts, radius, mat, parent=None, cyclic=False):
    data = bpy.data.curves.new(name+'_spline', 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 10
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(pts)-1)
    for point, coord in zip(spline.bezier_points, pts):
        point.co = coord
        point.handle_left_type = 'AUTO'
        point.handle_right_type = 'AUTO'
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    return link(obj, name, mat, parent)

def torus(name, loc, major, minor, mat, rotation=None, parent=None, sx=1, sy=1):
    bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=10, location=loc, major_radius=major, minor_radius=minor)
    obj = bpy.context.object
    if rotation:
        obj.rotation_euler = rotation
    obj.scale.x = sx
    obj.scale.y = sy
    return link(obj, name, mat, parent)

def signed_power(value, exponent):
    return (1 if value >= 0 else -1) * abs(value)**exponent

def cushion(name, loc, dims, mat=FABRIC, exponent=.35, parent=None, rotation=None):
    verts, faces = [], []
    rings, segments = 18, 36
    for j in range(rings+1):
        phi = -math.pi/2 + math.pi*j/rings
        for i in range(segments):
            theta = 2*math.pi*i/segments
            verts.append((dims[0]/2*signed_power(math.cos(phi),exponent)*signed_power(math.cos(theta),exponent), dims[1]/2*signed_power(math.cos(phi),exponent)*signed_power(math.sin(theta),exponent), dims[2]/2*signed_power(math.sin(phi),exponent)))
    for j in range(rings):
        for i in range(segments):
            a = j*segments+i
            b = j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    obj = mesh(name, verts, faces, mat, parent)
    obj.matrix_world = Matrix.Translation(loc)
    if rotation:
        obj.rotation_euler = rotation
    return obj

def pivot(name, loc, motion='rotation', axis='Y', amount=-1.57):
    obj = bpy.data.objects.new(name, None)
    obj.location = loc
    link(obj, name)
    obj['motion'] = motion
    obj['gltfAxis'] = axis
    obj['openAmount'] = amount
    return obj

def drawer(name, x, y, z, w, d, h, travel=.27):
    p = pivot(name, (x,y,z), 'translation', 'Z', travel)
    box(name+'_front',(x,y-d/2,z),(w,.018,h),WHITE,.003,p)
    box(name+'_bottom',(x,y,z-h/2+.016),(w-.045,d-.025,.014),WHITE,.002,p)
    for side in [-1,1]:
        box(name+'_side_'+str(side),(x+side*(w/2-.021),y,z-.005),(.012,d-.028,h-.042),WHITE,.002,p)
    box(name+'_back',(x,y+d/2-.022,z-.005),(w-.045,.012,h-.042),WHITE,.002,p)
    return p

def sofa():
    box('Low_upholstered_plinth',(0,0,.21),(2.20,.88,.29),FABRIC,.07)
    for x in [-1.02,1.02]:
        box('Wide_low_armrest',(x,0,.34),(.24,.95,.56),FABRIC,.045)
    box('Upholstered_back_frame',(0,.38,.55),(1.84,.18,.5),FABRIC,.04)
    for x in [-.453,.453]:
        cushion('Separate_seat_cushion',(x,-.1,.375),(.892,.64,.15),FABRIC,.32)
        cushion('Reclined_back_cushion',(x,.3,.63),(.892,.24,.405),FABRIC,.32,rotation=(-.10,0,0))
        pts = [(x-.40,-.389,.4),(x+.4,-.389,.4),(x+.423,-.355,.4),(x+.423,.18,.4),(x+.4,.204,.4),(x-.4,.204,.4),(x-.423,.18,.4),(x-.423,-.355,.4)]
        tube('Seat_sewn_piping',pts,.0022,SEAM,cyclic=True)
    for x in [-.93,.93]:
        for y in [-.32,.32]:
            cylinder('Recessed_foot',(x,y,0),(x,y,.09),.035,BLACK)

def table():
    box('Rounded_ash_tabletop',(0,0,.718),(1.4,.78,.044),ASH,.021)
    box('Tapered_underedge',(0,0,.689),(1.30,.68,.025),ASH,.011)
    for x in [-1,1]:
        for y in [-1,1]:
            cylinder('Splayed_tapered_leg',(x*.617,y*.304,0),(x*.57,y*.26,.694),.026,ASH,.043)
            box('Apron_joint',(x*.55,y*.25,.665),(.12,.10,.08),ASH,.015)

def chair():
    # Compound-curved veneered seat, front rounded and shallow ergonomic saddle.
    verts, faces = [], []
    n=20
    for j in range(n+1):
        v=j/n*2-1
        for i in range(n+1):
            u=i/n*2-1
            x=.22*u*(1-.065*abs(v)**7)
            y=-.032+.195*v*(1-.06*abs(u)**7)
            z=.449+.018*(u*u+v*v)-.006
            verts.append((x,y,z))
    for j in range(n):
        for i in range(n):
            a=j*(n+1)+i
            faces.append((a,a+1,a+n+2,a+n+1))
    seat=mesh('Sculpted_plywood_seat',verts,faces,ASH)
    solid=seat.modifiers.new('Laminated_seat_thickness','SOLIDIFY'); solid.thickness=.017
    bevel(seat,.007,3)
    for x in [-1,1]:
        cylinder('Front_tapered_leg',(x*.218,-.245,0),(x*.172,-.166,.44),.016,ASH,.026)
        cylinder('Continuous_rear_leg',(x*.197,.24,0),(x*.181,.21,.783),.018,ASH,.022)
        cylinder('Seat_side_stretcher',(x*.175,-.17,.407),(x*.175,.17,.407),.017,ASH)
    verts, faces=[],[]
    for j in range(9):
        t=j/8
        for i in range(29):
            u=i/28*2-1
            verts.append((u*(.203+.012*math.sin(t*math.pi)), .204+.031*(1-u*u)+t*.016, .623+t*.174+.006*(1-u*u)))
    for j in range(8):
        for i in range(28):
            a=j*29+i; faces.append((a,a+1,a+30,a+29))
    back=mesh('Curved_veneer_backrest',verts,faces,ASH)
    mod=back.modifiers.new('Bent_plywood_thickness','SOLIDIFY'); mod.thickness=.018
    bevel(back,.008,3)

def bed():
    box('High_straight_headboard',(0,.999,.5),(1.66,.092,1.0),WHITE,.007)
    box('Low_straight_footboard',(0,-1.005,.295),(1.66,.08,.17),WHITE,.004)
    for x in [-.79,.79]:
        box('Wide_side_rail',(x,0,.295),(.08,1.975,.17),WHITE,.004)
    cylinder('Steel_center_support',(0,-.95,.26),(0,.95,.26),.021,STEEL)
    for y in [-.8,-.6,-.4,-.2,0,.2,.4,.6,.8]:
        box('Sprung_wood_slat',(0,y,.302),(1.5,.064,.014),ASH,.005)
    cushion('Separate_staging_mattress',(0,-.01,.425),(1.50,1.96,.22),LINEN,.22)
    cushion('Sage_duvet',(0,-.30,.565),(1.48,1.36,.105),TAUPE,.19)
    cushion('Folded_duvet_turnback',(0,.32,.593),(1.47,.27,.08),LINEN,.25)
    for x in [-.38,.38]:
        cushion('Separate_staging_pillow',(x,.64,.58),(.65,.40,.14),LINEN,.52)
    for x in [-.65,-.5,-.25,.1,.4,.6]:
        tube('Duvet_soft_crease',[(x,-.84,.583),(x+.025,-.54,.605),(x-.01,-.15,.613)],.0017,TAUPE)

def desk():
    box('Micke_worktop',(0,0,.727),(1.05,.5,.046),WHITE,.004)
    # Metal U-frame and asymmetrical enclosed storage.
    for y in [-.221,.221]:
        box('Powder_coated_U_leg',(-.501,y,.348),(.026,.026,.696),WHITE,.003)
    box('U_frame_foot',(-.501,0,.014),(.026,.467,.028),WHITE,.003)
    box('Storage_side_panel',(.507,0,.37),(.036,.46,.68),WHITE,.003)
    box('Storage_inner_panel',(.197,0,.37),(.03,.46,.68),WHITE,.003)
    box('Storage_bottom',(.352,0,.061),(.32,.46,.033),WHITE,.003)
    box('Storage_back',(.352,.222,.375),(.32,.015,.64),WHITE,.002)
    box('Storage_shelf',(.351,0,.327),(.28,.438,.019),WHITE,.002)
    p=pivot('pivot_door_right',(.487,-.23,.31),amount=1.67)
    box('Micke_storage_door',(.354,-.238,.33),(.277,.019,.48),WHITE,.002,p)
    box('Recessed_finger_pull',(.249,-.249,.54),(.045,.006,.012),DARK,.002,p)
    drawer('pivot_drawer_main',-.157,-.005,.657,.666,.45,.095,.27)
    box('Main_drawer_finger_reveal',(-.157,-.236,.696),(.09,.008,.008),DARK,.002)
    box('Rear_cable_tray',(-.153,.199,.61),(.66,.09,.025),WHITE,.002)
    cylinder('Cable_grommet',( .328,.156,.751),(.328,.156,.752),.025,DARK,vertices=32)
    cylinder('Cable_grommet_cap',(.331,.158,.752),(.331,.158,.753),.022,WHITE,vertices=32)

def cabinet():
    for x in [-.389,.389]:
        box('Malm_chest_side',(x,0,.5),(.022,.48,1),WHITE,.003)
    box('Malm_chest_top',(0,0,.988),(.8,.48,.024),WHITE,.003)
    box('Malm_chest_back',(0,.23,.49),(.76,.018,.93),WHITE,.002)
    box('Recessed_plinth',(0,.008,.043),(.72,.43,.086),WHITE,.002)
    for i in range(4):
        z=.197+i*.225
        drawer('pivot_drawer_'+str(i+1),0,-.002,z,.75,.45,.212,.27)
        box('Finger_pull_shadow_'+str(i),(0,-.223,z+.109),(.72,.015,.012),DARK,.002)

def wardrobe():
    for x in [-.49,.49]:
        box('Pax_carcass_side',(x,.008,1.182),(.02,.584,2.364),WHITE,.002)
    box('Pax_top',(0,.008,2.354),(.98,.584,.02),WHITE,.002)
    box('Pax_bottom',(0,.008,.069),(.98,.584,.028),WHITE,.002)
    box('Pax_back',(0,.287,1.18),(.96,.015,2.3),WHITE,.001)
    box('Pax_recessed_plinth',(0,.01,.027),(.95,.5,.054),WHITE,.002)
    for z in [.4,.75,1.96]:
        box('Komplement_shelf',(0,0,z),(.96,.547,.018),WHITE,.002)
    cylinder('Hanging_rail',(-.472,.012,1.84),(.472,.012,1.84),.014,CHROME)
    for side in [-1,1]:
        p=pivot('pivot_door_left' if side<0 else 'pivot_door_right',(side*.491,-.286,0),amount=side*1.67)
        box('Forsand_door', (side*.249,-.291,1.184),(.493,.018,2.345),WHITE,.002,p)
        # FORSAND handles sold separately: no invented external handle.
        for z in [.19,1.18,2.16]:
            cylinder('Concealed_hinge_barrel',(side*.479,-.266,z-.02),(side*.479,-.266,z+.02),.007,STEEL,parent=p)
            box('Hinge_mount_plate',(side*.464,-.25,z),(.03,.05,.022),STEEL,.003)

def tv():
    box('Airslim_panel',(0,.013,.3944),(1.2321,.0257,.7088),BLACK,.004)
    box('Slim_display_glass',(0,-.001,.397),(1.215,.0015,.687),SCREEN,.0005)
    # Deliberate reflected gradient geometry, not a photo texture.
    box('Lower_bezel',(0,-.003,.043),(1.223,.003,.008),BLACK,.001)
    for x in [-.415,.415]:
        box('Slimline_stand_foot',(x,0,.006),(.034,.2263,.012),BLACK,.004)
        box('Stand_stem',(x,.018,.03),(.022,.026,.048),BLACK,.003)
    box('Rear_electronics_spine',(0,.02,.247),(.63,.014,.32),BLACK,.007)
    cylinder('Standby_LED',(.535,-.004,.042),(.535,-.005,.042),.0015,RED)

def refrigerator():
    for x in [-.376,.376]:
        box('Insulated_refrigerator_side',(x,.014,.916),(.028,.70,1.768),STEEL,.01)
        box('Moulded_interior_liner',(x*.92,.014,.908),(.018,.652,1.702),WHITE,.009)
    box('Insulated_refrigerator_back',(0,.343,.916),(.756,.042,1.768),STEEL,.012)
    for z in [.043,1.775]:
        box('Insulated_refrigerator_cap',(0,.014,z),(.78,.70,.05),STEEL,.015)
    box('Freezer_partition',(0,.014,1.277),(.70,.652,.055),WHITE,.012)
    # Actual front door gaps, separate upper freezer and lower fridge.
    for label,z,h in [('freezer',1.54,.493),('fridge',.652,1.246)]:
        p=pivot('pivot_door_'+label,(-.382,-.325,z),amount=-1.57)
        box('Magnetic_gasket_'+label,(0,-.336,z),(.747,.018,h-.011),RUBBER,.015,p)
        box('Brushed_door_'+label,(0,-.347,z),(.772,.036,h),STEEL,.018,p)
        # Pocket handle recess near the horizontal partition.
        hz=z-h/2+.035 if label=='freezer' else z+h/2-.035
        box('Pocket_handle_recess_'+label,(.205,-.368,hz),(.24,.006,.028),DARK,.009,p)
        box('Pocket_handle_lip_'+label,(.205,-.372,hz+.012),(.248,.007,.009),STEEL,.003,p)
        for yy in [0,.17]:
            box('Interior_door_bin_'+label,(0,-.28,z-h/2+.13+yy),(.63,.12,.063),WHITE,.01,p)
    for x in [-.30,.30]:
        cylinder('Adjustable_leveling_foot',(x,-.27,0),(x,-.27,.045),.026,BLACK)
    for z in [.39,.73,1.05,1.32]:
        box('Tempered_internal_shelf',(0,-.015,z),(.69,.56,.013),GLASS,.002)
    box('Door_badge',(-.279,-.368,1.685),(.08,.002,.018),STEEL,.002)

def washingMachine():
    chassis=box('LG_frontloader_chassis',(0,.01,.425),(.6,.545,.85),WHITE,.014)
    hole=cylinder('Temporary_porthole_cut',(0,-.40,.429),(0,-.10,.429),.214,WHITE,vertices=64)
    bpy.context.view_layer.objects.active=chassis
    mod=chassis.modifiers.new('Real_recessed_drum_opening','BOOLEAN'); mod.operation='DIFFERENCE'; mod.object=hole
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(hole,do_unlink=True)
    box('Upper_control_fascia',(0,-.271,.766),(.577,.02,.12),WHITE,.006)
    box('Detergent_drawer_front',(-.174,-.284,.773),(.184,.009,.084),WHITE,.003)
    box('Detergent_pull_reveal',(-.174,-.29,.753),(.13,.005,.011),DARK,.002)
    cylinder('Programme_knob',(0,-.28,.777),(0,-.300,.777),.034,STEEL,vertices=40)
    box('Digital_control_display',(.177,-.283,.775),(.172,.005,.064),BLACK,.005)
    for i in range(4):
        box('Display_segment',(.126+i*.025,-.287,.784),(.012,.002,.026),SCREEN,.001)
    p=pivot('pivot_door_left',(-.225,-.281,.43),amount=-1.74)
    torus('Door_outer_chrome_ring',(0,-.287,.429),.195,.021,STEEL,(math.pi/2,0,0),p)
    torus('Door_black_inner_rim',(0,-.296,.429),.17,.016,BLACK,(math.pi/2,0,0),p)
    cylinder('Smoked_round_porthole',(0,-.291,.429),(0,-.305,.429),.17,GLASS,parent=p,vertices=64)
    box('Recessed_door_grip',(.181,-.31,.435),(.023,.012,.075),BLACK,.006,p)
    torus('Fixed_rubber_bellows',(0,-.259,.429),.172,.022,RUBBER,(math.pi/2,0,0))
    cylinder('Stainless_drum',(0,-.235,.429),(0,-.055,.429),.157,STEEL,vertices=48)
    for ring in [.055,.09,.13]:
        for i in range(16):
            a=i*2*math.pi/16
            cylinder('Drum_perforation',(math.cos(a)*ring,-.237,.429+math.sin(a)*ring),(math.cos(a)*ring,-.239,.429+math.sin(a)*ring),.004,DARK,vertices=8)
    box('Lower_service_hatch',(.20,-.268,.088),(.11,.008,.073),WHITE,.006)
    for x in [-.24,.24]:
        for y in [-.2,.2]:
            cylinder('Anti_vibration_foot',(x,y,0),(x,y,.025),.021,RUBBER)

def oval_shell(name, profiles, mat=CERAMIC, exponent=1, center=(0,0,0), parent=None, hollow=False):
    """A closed continuous outer-wall/rim/inner-basin profile, not stacked solids."""
    verts, faces=[],[]
    n=72
    for rx,ry,z in profiles:
        for i in range(n):
            a=2*math.pi*i/n
            verts.append((center[0]+rx*signed_power(math.cos(a),exponent),center[1]+ry*signed_power(math.sin(a),exponent),center[2]+z))
    for ring in range(len(profiles)-1):
        for i in range(n):
            a=ring*n+i; b=ring*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    if hollow:
        for i in range(n):
            a=(len(profiles)-1)*n+i; b=(len(profiles)-1)*n+(i+1)%n
            faces.append((a,b,(i+1)%n,i))
    else:
        faces.append(tuple(reversed(range(n))))
        faces.append(tuple((len(profiles)-1)*n+i for i in range(n)))
    return mesh(name,verts,faces,mat,parent)

def sink():
    # SUNNERSTA includes a low open shelf and a tall utensil rail, no door cabinet.
    for x in [-.545,.545]:
        for y in [-.261,.261]:
            cylinder('Powder_coated_tube_leg',(x,y,.017),(x,y,.90),.012,WHITE)
            cylinder('Adjustable_black_foot',(x,y,0),(x,y,.028),.015,BLACK)
        tube('Raised_rear_utensil_rail',[(x,.258,.84),(x,.258,1.34),(x*.97,.258,1.378)],.011,WHITE)
    cylinder('Rear_top_hanging_bar',(-.529,.258,1.378),(.529,.258,1.378),.012,WHITE)
    for z in [.13,.867]:
        cylinder('Front_horizontal_frame',(-.545,-.261,z),(.545,-.261,z),.011,WHITE)
        cylinder('Rear_horizontal_frame',(-.545,.261,z),(.545,.261,z),.011,WHITE)
    box('Low_open_storage_shelf',(.263,0,.15),(.534,.495,.018),WHITE,.005)
    box('Sink_draining_worktop',(.269,0,.897),(.582,.56,.025),STEEL,.011)
    box('Sink_outer_left_rim',(-.53,0,.897),(.06,.56,.025),STEEL,.011)
    for y in [-.24,.24]:
        box('Sink_front_back_rim',(-.264,y,.897),(.48,.08,.025),STEEL,.011)
    oval_shell('Deep_pressed_sink_bowl',[(.22,.203,.903),(.215,.198,.886),(.202,.184,.875),(.164,.141,.731),(.149,.128,.724)],STEEL,.35,(-.273,0,0))
    cylinder('Drain_strainer',(-.273,0,.725),(-.273,0,.729),.033,CHROME,vertices=32)
    for i in range(8):
        a=i*math.pi/4
        cylinder('Drain_slot',(-.273+math.cos(a)*.02,math.sin(a)*.02,.730),(-.273+math.cos(a)*.02,math.sin(a)*.02,.731),.0035,DARK,vertices=8)
    tube('Visible_water_trap',[(-.273,0,.716),(-.273,0,.57),(-.22,0,.52),(-.16,0,.565),(-.16,.23,.60)],.025,WHITE)
    cylinder('Lagan_tap_body',(-.273,.214,.91),(-.273,.214,1.04),.023,CHROME)
    tube('Lagan_spout',[(-.273,.214,1.02),(-.273,.12,1.075),(-.273,.015,1.055),(-.273,-.004,1.028)],.013,CHROME)
    cylinder('Single_lever_control',(-.273,.218,1.047),(-.273,.15,1.073),.009,CHROME)
    for x in [-.42,-.18,.08,.31,.43]:
        tube('Utensil_hook',[(x,.258,1.38),(x,.234,1.36),(x,.232,1.31),(x,.21,1.30)],.004,WHITE)
    for y in [-.18,-.12,-.06,0,.06,.12,.18]:
        box('Shallow_drainer_channel',(.28,y,.911),(.435,.003,.001),STEEL,.0003)

def cooktop():
    box('Recessed_installation_body',(0,0,.022),(.55,.49,.044),BLACK,.008)
    box('Black_ceramic_glass',(0,0,.046),(.590,.520,.006),BLACK,.003)
    marking=material('Induction_zone_print',(.33,.34,.34),.42)
    for x,y,r in [(-.148,-.10,.105),(.149,-.10,.0725),(-.145,.13,.09),(.145,.13,.09)]:
        torus('Induction_zone_ring',(x,y,.0492),r,.0008,marking)
    for i in range(4):
        x=-.055+i*.036
        box('Touch_slider_mark',(x,-.217,.0495),(.013,.0018,.0005),marking,.0002)
    torus('Touch_power_icon',(-.138,-.217,.0495),.006,.0007,marking)
    box('Power_icon_stroke',(-.138,-.211,.0495),(.0013,.008,.0005),marking,.0002)

def bathtub():
    oval_shell('Evok_continuous_oval_acrylic_shell',[(.725,.275,0),(.770,.325,.025),(.825,.365,.16),(.850,.375,.52),(.850,.375,.602),(.845,.370,.610),(.825,.350,.610),(.810,.338,.595),(.775,.318,.49),(.630,.287,.225),(.575,.282,.203),(.5635,.282,.200)],ACRYLIC,.86)
    cylinder('Flush_bath_drain',(0,0,.201),(0,0,.204),.020,CHROME,vertices=32)
    # Overflow is a visible, shallow internal recess, not a black decal texture.
    box('Overflow_slot',(0,.324,.497),(.105,.003,.009),DARK,.004)

def toilet():
    oval_shell('Skirted_ceramic_pedestal',[(.138,.195,0),(.152,.204,.025),(.148,.195,.13),(.137,.197,.235),(.173,.223,.318),(.195,.239,.365)],CERAMIC,.85,(0,-.095,0))
    oval_shell('Sculpted_open_toilet_bowl',[(.191,.235,.315),(.205,.245,.371),(.203,.244,.38),(.173,.212,.384),(.158,.19,.367),(.124,.152,.298),(.065,.075,.244)],CERAMIC,.95,(0,-.115,0))
    box('Rear_tank_pedestal',(0,.243,.195),(.18,.15,.390),CERAMIC,.016)
    box('Ceramic_flush_neck',(0,.136,.332),(.17,.135,.085),CERAMIC,.03)
    box('Compact_flush_tank',(0,.265,.556),(.42,.19,.346),CERAMIC,.024)
    box('Separate_tank_lid',(0,.265,.728),(.42,.19,.024),CERAMIC,.010)
    cylinder('Side_flush_lever_pivot',(-.205,.251,.674),(-.211,.251,.674),.013,CHROME)
    box('Side_flush_lever',(-.210,.229,.674),(.006,.057,.017),CHROME,.006)
    p=pivot('pivot_lid',(0,.120,.405),'rotation','X',-1.70)
    cushion('Soft_close_seat_lid',(0,-.115,.409),(.39,.47,.027),WHITE,.78,p)
    for x in [-.083,.083]:
        cylinder('Seat_hinge',(x-.018,.12,.394),(x+.018,.12,.394),.014,CHROME)
    # Separate seat ring is visible with the lid opened.
    torus('Oval_seat_ring',(0,-.115,.392),.165,.015,WHITE,sx=1.04,sy=1.30)

def shower():
    # Enclosure is our own staging design; Crometta is the referenced fixture only.
    clear=material('Clear_safety_glass',(.72,.88,.9),.10)
    bsdf=clear.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Alpha'].default_value=.075
    clear.diffuse_color=(.72,.88,.9,.075)
    clear.surface_render_method='DITHERED'
    box('Custom_shower_tray',(0,0,.038),(.9,.9,.076),CERAMIC,.024)
    box('Tray_drain',(0,.24,.077),(.25,.045,.002),STEEL,.01)
    for x in [-.445,.445]:
        box('Minimal_glass_edge_post',(x,.438,1.20),(.010,.018,2.30),CHROME,.002)
        box('Transparent_side_screen',(x,0,1.22),(.006,.87,2.24),clear,.002)
    box('Rear_safety_glass',(0,.443,1.22),(.87,.006,2.24),clear,.002)
    p=pivot('pivot_door_left',(-.438,-.402,.08),amount=-1.57)
    box('Glass_access_door',(0,-.405,1.213),(.870,.006,2.25),clear,.002,p)
    for z in [.41,1.96]:
        box('Glass_door_hinge',(-.431,-.408,z),(.028,.025,.047),CHROME,.004,p)
    tube('Glass_door_pull',[(.335,-.410,1.05),(.335,-.441,1.08),(.335,-.441,1.25),(.335,-.410,1.28)],.008,CHROME,p)
    fixture=pivot('Crometta_fixture_mount',(0,.407,1.10),'fixed','Y',0)
    # mixer at 1.10m is an installation assumption, official top offset1.201m.
    cylinder('Thermostatic_mixer',(-.1475,.335,1.1),(.1475,.335,1.1),.024,CHROME,parent=fixture)
    for x in [-.125,.125]:
        cylinder('Mixer_end_control',(x-.022,.335,1.1),(x+.022,.335,1.1),.028,CHROME,parent=fixture)
    for z in [1.13,2.11]:
        cylinder('Wall_mount_rosette',(0,.443,z),(0,.398,z),.025,CHROME,parent=fixture)
    tube('Crometta_riser_and_gooseneck',[(0,.40,1.1),(0,.40,2.19),(0,.38,2.279),(0,.28,2.29),(0,.095,2.29)],.011,CHROME,fixture)
    box('Crometta_E_240_rainhead',(0,.093,2.28),(.240,.240,.024),CHROME,.012,fixture)
    box('Rainhead_spray_face',(0,.093,2.266),(.219,.219,.004),WHITE,.010,fixture)
    for ix in range(9):
        for iy in range(9):
            cylinder('Silicone_spray_nozzle',(-.088+ix*.022,.005+iy*.022,2.260),(-.088+ix*.022,.005+iy*.022,2.265),.0016,DARK,parent=fixture,vertices=8)
    tube('Flexible_handshower_hose',[(.04,.324,1.095),(.08,.30,.80),(.22,.28,.75),(.28,.30,1.05),(.20,.34,1.46)],.008,CHROME,fixture)
    cylinder('Handshower_grip',(.20,.34,1.43),(.20,.319,1.565),.012,CHROME,parent=fixture)
    cylinder('Round_handshower_head',(.20,.325,1.606),(.20,.302,1.606),.046,CHROME,parent=fixture,vertices=40)
    cylinder('Handshower_spray_plate',(.20,.30,1.606),(.20,.297,1.606),.041,WHITE,parent=fixture,vertices=40)

def bent_strip(name, points, x, width, thickness, mat):
    """Catmull-Rom bentwood centreline with a real rectangular laminated section."""
    centres=[]
    controls=[Vector((y,z)) for y,z in points]
    for i in range(len(controls)-1):
        a=controls[max(i-1,0)]; b=controls[i]; c=controls[i+1]; d=controls[min(i+2,len(controls)-1)]
        for step in range(7):
            t=step/7
            centres.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    centres.append(controls[-1])
    verts,faces=[],[]
    for i,point in enumerate(centres):
        tangent=(centres[min(i+1,len(centres)-1)]-centres[max(i-1,0)]).normalized()
        normal=Vector((-tangent.y,tangent.x))*thickness/2
        for side,up in [(-1,-1),(1,-1),(1,1),(-1,1)]:
            verts.append((x+side*width/2,point.x+up*normal.x,point.y+up*normal.y))
    for i in range(len(centres)-1):
        for j in range(4):
            a=i*4+j; b=i*4+(j+1)%4
            faces.append((a,b,b+4,a+4))
    faces.extend([(3,2,1,0),tuple((len(centres)-1)*4+i for i in range(4))])
    obj=mesh(name,verts,faces,mat)
    bevel(obj,.004,2)
    return obj

def armchair():
    bent=material('Black_stained_bent_birch',(.024,.025,.027),.34)
    blue=material('TINT_Kelinge_corduroy',(.18,.27,.32),.94)
    for x in [-.319,.319]:
        bent_strip('Continuous_bentwood_cantilever',[(.34,.019),(-.30,.019),(-.375,.065),(-.33,.28),(-.267,.59),(-.16,.633),(.20,.638)],x,.042,.032,bent)
        bent_strip('Laminated_seat_back_rail',[(-.34,.385),(-.08,.389),(.145,.45),(.24,.72),(.34,.97)],x*.91,.03,.035,bent)
        cylinder('Visible_arm_assembly_bolt',(x-.024,-.267,.56),(x+.024,-.267,.56),.006,STEEL)
    for y,z in [(-.28,.383),(.085,.417),(.25,.76)]:
        cylinder('Frame_cross_brace',(-.295,y,z),(.295,y,z),.018,bent)
    cushion('Poang_seat_pad',(0,-.104,.437),(.565,.49,.082),blue,.34,rotation=(.08,0,0))
    cushion('Long_reclined_back_pad',(0,.236,.692),(.565,.089,.522),blue,.34,rotation=(-.29,0,0))
    cushion('Attached_head_cushion',(0,.297,.935),(.56,.104,.13),blue,.45,rotation=(-.29,0,0))
    # Corduroy ribs are modeled subtly along the near silhouette only.
    for x in [-.22,-.11,0,.11,.22]:
        tube('Corduroy_stitched_channel',[(x,.169,.51),(x,.198,.65),(x,.235,.78),(x,.27,.9)],.0011,blue)

def floorLamp():
    shade=material('TINT_White_linen_lampshade',(.84,.81,.74),.9)
    for i in range(3):
        a=math.pi/6+i*2*math.pi/3
        cylinder('Ash_tripod_leg',(math.cos(a)*.295,math.sin(a)*.295,0),(math.cos(a)*.055,math.sin(a)*.055,1.145),.022,ASH,.016)
    cylinder('Height_adjustable_ash_column',(0,0,.78),(0,0,1.29),.027,ASH)
    cylinder('Adjustment_thumb_screw',(.018,0,1.012),(.05,0,1.012),.013,BLACK)
    oval_shell('Hollow_fabric_shade',[(.185,.185,1.195),(.183,.183,1.49),(.177,.177,1.495),(.177,.177,1.207)],shade,hollow=True)
    torus('Shade_lower_wire_hem',(0,0,1.195),.18,.003,WHITE)
    torus('Shade_upper_wire_hem',(0,0,1.497),.18,.003,WHITE)
    bulb=material('Warm_frosted_lamp',(.92,.74,.40),.5,emission=.45)
    cushion('Separate_LED_bulb',(0,0,1.34),(.085,.085,.115),bulb,1)
    cylinder('Lamp_holder',(0,0,1.215),(0,0,1.287),.025,WHITE)
    tube('Short_staging_cable',[(0,.02,.99),(.04,.06,.46),(.12,.2,.014),(.20,.20,.01)],.003,BLACK)

def tableLamp():
    frost=material('TINT_Frosted_opal_globe',(.91,.90,.83),.38,emission=.18)
    cylinder('Fado_polypropylene_base',(0,0,0),(0,0,.02),.071,WHITE,vertices=48)
    profile=[]
    for i in range(29):
        a=-.93+i*(math.pi/2+.93)/28
        profile.append((.125*math.cos(a),.125*math.cos(a),.115+.125*math.sin(a)))
    oval_shell('Opaline_spherical_glass',profile,frost)

def pendantLamp():
    # Real open woven lattice: forty longitudinal bamboo strips and ring bands.
    profiles=[(.145,.012),(.185,.05),(.225,.105),(.25,.18),(.248,.25),(.218,.32),(.17,.39),(.14,.465),(.085,.505)]
    for i in range(40):
        a=i*2*math.pi/40
        verts,faces=[],[]
        for radius,z in profiles:
            for radial,angular in [(-1,-1),(1,-1),(1,1),(-1,1)]:
                r=radius+radial*.0018
                t=a+angular*.010/(2*max(radius,.085))
                verts.append((r*math.cos(t),r*math.sin(t),z))
        for j in range(len(profiles)-1):
            for k in range(4):
                aa=j*4+k; bb=j*4+(k+1)%4
                faces.append((aa,bb,bb+4,aa+4))
        faces.extend([(3,2,1,0),tuple((len(profiles)-1)*4+k for k in range(4))])
        strip=mesh('Woven_bamboo_longitudinal_strip',verts,faces,ASH)
        bevel(strip,.0008,2)
    for r,z in profiles:
        torus('Bamboo_horizontal_ring',(0,0,z),r,.004,ASH)
    for i in range(len(profiles)-1):
        r=(profiles[i][0]+profiles[i+1][0])/2
        z=(profiles[i][1]+profiles[i+1][1])/2
        torus('Bamboo_intermediate_weave',(0,0,z),r,.0024,ASH)
    cylinder('Black_pendant_socket',(0,0,.40),(0,0,.54),.023,BLACK)
    bulb=material('Warm_pendant_bulb',(.95,.78,.45),.4,emission=.3)
    cushion('Separate_pendant_LED_bulb',(0,0,.35),(.075,.075,.105),bulb,1)
    pivot('mount_ceiling_anchor',(0,0,.54),'fixed','Y',0)

FACTORIES={'sofa':sofa,'table':table,'chair':chair,'bed':bed,'desk':desk,'cabinet':cabinet,'wardrobe':wardrobe,'tv':tv,'refrigerator':refrigerator,'washingMachine':washingMachine}
DIMENSIONS={'sofa':[2.28,.83,.95],'table':[1.4,.74,.78],'chair':[.46,.80,.51],'bed':[1.66,1,2.09],'desk':[1.05,.75,.5],'cabinet':[.8,1,.48],'wardrobe':[1,2.364,.6],'tv':[1.2321,.7488,.2263],'refrigerator':[.78,1.8,.73],'washingMachine':[.6,.85,.565]}
DIMENSIONS.update({'sink':[1.12,1.39,.56],'cooktop':[.59,.049,.52],'bathtub':[1.7,.61,.75],'toilet':[.42,.74,.72],'shower':[.9,2.35,.9]})
DIMENSIONS.update({'armchair':[.68,1,.82],'floorLamp':[.62,1.51,.62],'tableLamp':[.25,.24,.25],'pendantLamp':[.5,.54,.5]})

def normalize_geometry(root, dims):
    # Bake evaluated modifiers and all transforms while preserving meaningful
    # pivot translations. Root/local scales become exactly identity.
    bpy.context.view_layer.update()
    objects=list(STATE['collection'].objects)
    graph=bpy.context.evaluated_depsgraph_get()
    meshes=[]
    verts=[]
    for obj in objects:
        if obj.type in {'MESH','CURVE'}:
            evaluated=obj.evaluated_get(graph)
            data=bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=graph)
            transform=obj.matrix_world.copy()
            world=[transform @ vertex.co for vertex in data.vertices]
            meshes.append((obj,data,world))
            verts.extend(world)
    low=Vector([min(p[i] for p in verts) for i in range(3)])
    high=Vector([max(p[i] for p in verts) for i in range(3)])
    center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
    target=Vector((dims[0],dims[2],dims[1]))
    scale=Vector([target[i]/(high[i]-low[i]) for i in range(3)])
    def adjusted(point):
        return Vector([(point[i]-center[i])*scale[i] for i in range(3)])
    # Pivots are translation-only in rest pose; axes are authored explicitly.
    positions={obj.name:adjusted(obj.matrix_world.translation) for obj in objects if obj.type=='EMPTY' and obj!=root}
    for obj in objects:
        if obj.type=='EMPTY' and obj!=root:
            obj.matrix_world=Matrix.Translation(positions[obj.name])
    for obj,data,world in meshes:
        name=obj.name
        parent=obj.parent
        offset=positions.get(parent.name,Vector((0,0,0))) if parent else Vector((0,0,0))
        for vertex,point in zip(data.vertices,world):
            vertex.co=adjusted(point)-offset
        if obj.type=='CURVE':
            new=bpy.data.objects.new(name+'_mesh',data)
            STATE['collection'].objects.link(new)
            new.parent=parent
            new.matrix_local=Matrix.Identity(4)
            bpy.data.objects.remove(obj,do_unlink=True)
            new.name=name
        else:
            obj.modifiers.clear()
            obj.data=data
            obj.matrix_local=Matrix.Identity(4)
    root.matrix_world=Matrix.Identity(4)
    bpy.context.view_layer.update()
    root['dimensionsWHd']=dims
    root['referenceOnly']=True
    root['measuredByAuthor']=False
    root['authoredIn']='Blender 4.5 via Blender MCP'
    root['frontAxis']='glTF +Z'
    root['calibrationScaleXYZ']=list(scale)

def setup_stage(dims):
    stage=bpy.data.collections.get('STUDIO')
    if stage:
        for obj in list(stage.objects):
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(stage)
    stage=bpy.data.collections.new('STUDIO'); bpy.context.scene.collection.children.link(stage)
    def stage_link(obj):
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        stage.objects.link(obj)
    s=max(dims)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002))
    floor=bpy.context.object; floor.name='Studio_floor'; stage_link(floor)
    floor.data.materials.append(material('Studio_mushroom_v2',(.54,.53,.50),.84))
    bpy.ops.object.camera_add(location=(s*1.5,-s*1.85,s*1.34))
    camera=bpy.context.object; stage_link(camera)
    target=Vector((0,0,dims[1]*.43))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO'
    camera.data.ortho_scale=max(dims[0]+dims[2]*.48,dims[1]*1.20)*1.40
    bpy.context.scene.camera=camera
    for name,loc,power,size in [('Key',(-s*1.8,-s*2.1,s*3),s*s*300,s*2),('Fill',(s*2,-s*.3,s*1.8),s*s*100,s*1.6),('Rim',(0,s*2,s*2.8),s*s*200,s*1.5)]:
        data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
        obj=bpy.data.objects.new(name,data); stage.objects.link(obj); obj.location=loc
        obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=20
    scene.cycles.use_denoising=True
    scene.render.resolution_x=512; scene.render.resolution_y=512; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    scene.world.color=(.35,.35,.35)
    scene.view_settings.view_transform='AgX'

def build(kind):
    existing=bpy.data.collections.get('ASSET_'+kind)
    if existing:
        for obj in list(existing.objects):
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(existing)
    for col in bpy.data.collections:
        if col.name.startswith('ASSET_'):
            col.hide_render=True; col.hide_viewport=True
            prefix=col.name[6:]+'__'
            for obj in col.objects:
                if not obj.name.startswith(prefix):
                    obj.name=prefix+obj.name
    collection=bpy.data.collections.new('ASSET_'+kind)
    STATE['collection']=collection
    bpy.context.scene.collection.children.link(collection)
    STATE['parent']=None
    root=bpy.data.objects.new(kind+'_root',None)
    collection.objects.link(root)
    STATE['parent']=root
    if kind=='sofa': sofa()
    if kind=='chair': chair()
    if kind=='table': table()
    if kind=='bed': bed()
    if kind=='desk': desk()
    if kind=='cabinet': cabinet()
    if kind=='wardrobe': wardrobe()
    if kind=='tv': tv()
    if kind=='refrigerator': refrigerator()
    if kind=='washingMachine': washingMachine()
    if kind=='sink': sink()
    if kind=='cooktop': cooktop()
    if kind=='bathtub': bathtub()
    if kind=='toilet': toilet()
    if kind=='shower': shower()
    if kind=='armchair': armchair()
    if kind=='floorLamp': floorLamp()
    if kind=='tableLamp': tableLamp()
    if kind=='pendantLamp': pendantLamp()
    if kind not in DIMENSIONS: raise ValueError('Unknown asset type: '+kind)
    normalize_geometry(root,DIMENSIONS[kind])
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=ROOT+kind+'.glb',export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT')
    triangles=sum(sum(len(face.vertices)-2 for face in obj.data.polygons) for obj in collection.objects if obj.type=='MESH')
    pivots=[{'name':obj.name,'motion':obj.get('motion'),'axis':obj.get('gltfAxis'),'openAmount':obj.get('openAmount')} for obj in collection.objects if obj.type=='EMPTY' and obj!=root]
    print('ASSET_RESULT '+json.dumps({'type':kind,'dimensions':DIMENSIONS[kind],'triangles':triangles,'objects':len(collection.objects),'pivots':pivots,'calibrationScaleXYZ':list(root['calibrationScaleXYZ'])}))
    setup_stage(DIMENSIONS[kind])
    bpy.context.scene.render.filepath=ROOT+'renders/'+kind+'.png'
    bpy.ops.render.render(write_still=True)
    bpy.context.scene['last_asset']=kind
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'interior-furniture.blend')

bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.unit_settings.scale_length=1
batch=bpy.context.scene.get('asset_batch','sofa,chair,table,desk,bed').split(',')
for kind in batch:
    build(kind.strip())
