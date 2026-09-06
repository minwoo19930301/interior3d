"""Prepare a portable build payload; deliberately never starts Blender or calls MCP."""
import argparse
import hashlib
import json
from pathlib import Path

ASSETS = 'sofa,chair,table,desk,bed,cabinet,wardrobe,tv,refrigerator,washingMachine,sink,cooktop,bathtub,toilet,shower,armchair,floorLamp,tableLamp,pendantLamp'


def prepare(output):
    output = output.resolve()
    if output.exists():
        raise ValueError('Output must be a NEW directory; existing files are never overwritten')
    template = (Path(__file__).resolve().parent / 'build_assets.py').read_text()
    compile(template, 'build_assets.py', 'exec')
    preflight = f'''# Generated payload: run ONLY via a reviewed, dedicated local Blender MCP.
import bpy
if bpy.app.version[:3] != (4, 5, 11):
    raise RuntimeError('The source release used Blender 4.5.11; review version differences before rebuilding')
if len(bpy.data.objects) != 0:
    raise RuntimeError('A fresh empty dedicated Blender scene is required; no existing objects are deleted')
bpy.context.scene['asset_output_dir'] = {str(output)!r}
bpy.context.scene['asset_batch'] = {ASSETS!r}
'''
    payload = preflight + '\n' + template
    compile(payload, 'build_mcp.py', 'exec')
    output.mkdir(parents=True)
    for name in ('renders', 'textures'):
        (output / name).mkdir()
    (output / 'build_mcp.py').write_text(payload)
    print(json.dumps({
        'status': 'prepared_only_no_mcp_call',
        'payload': str(output / 'build_mcp.py'),
        'output': str(output),
        'types': ASSETS.split(','),
        'portableBuilderSha256': hashlib.sha256(template.encode()).hexdigest(),
        'nextStep': 'Review the payload, then send it to execute_blender_code through a separately configured trusted local MCP client. Do not run in an existing document.',
    }, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    prepare(parser.parse_args().output)
