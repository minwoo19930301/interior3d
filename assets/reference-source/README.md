# Editable source and reproduction

`interior-furniture.blend` contains all 19 authored model collections and two packed procedural maps. Open it in Blender 4.5.11 LTS. Models are unofficial visual reconstructions inspired by real products, not manufacturer CAD. Reference dimensions/URLs/SKUs and limits are in `../../public/models/catalog.json` and `../../docs/assets/manifest.json`.

The models were actually generated through a reviewed local Blender MCP connection, using serial calls to `execute_blender_code`. The original source scene was preserved; this distributed copy was separately saved and reopened through that MCP connection after removing private path metadata. The copy SHA-256 is `03dac07c9a72d9b439abfeab9c48c87fcbafab23ecfb889750c21402cda450f5` (13,056,212 bytes). Two packed maps and all 19 collections survived reopening.

All 19 saved collections were re-exported through the real MCP connection into a separate directory: geometry/accessor bytes, hierarchy, transforms, motion metadata, materials, texture bindings and embedded image bytes matched the app GLBs after normalizing collection-name prefixes. The comparison covered 5,550,760 accessor-reference payload bytes and 399,339 embedded-image bytes. Whole GLB file bytes differ because of node names and operational scene extras. This is a saved-master comparison, not a fresh code-generated rebuild or browser appearance test.

Evidence is in `../../docs/assets/master-all-19-comparison.json`. The additional `../../docs/assets/master-all-19-preservation.json` confirms the entire BIN chunk is byte-identical for every model, and the full JSON matches after removing only the known collection-name prefix and two operational scene fields (`last_asset`, `asset_batch`). No exporter ordering difference occurred in this check. Both masters and all release GLBs remained unchanged. Earlier cleanup and five-sample reports are preserved as historical checks; their `notVerified` lists describe only their original scope. To compare a new set of all-19 exports yourself, run `node assets/reference-source/compare_all_exports.mjs public/models PATH_TO_REEXPORTS`.

## Build a new collection through MCP

Use a fresh, empty, dedicated Blender scene, never an existing user document. The scripts do not install an MCP bridge or reproduce its local security/telemetry settings. A separately reviewed loopback-only connection is required.

```sh
python3 assets/reference-source/prepare_mcp_build.py --output work/new-reference-build
```

This command only prepares a payload and new output directories. Review the generated `build_mcp.py`, then send it through your bridge's actual `execute_blender_code` tool. It requires Blender 4.5.11 and refuses a non-empty scene. It constructs all 19 models, exports GLBs, renders thumbnails and saves a new master. The run-specific payload includes your chosen output path and should remain private.

The portable builder changes output-path configuration from the original generation script. A fresh all-19 rebuild using this portable version has not been run; object names, cached state, exporter versions and render devices can affect output. Bit-for-bit full replay is not claimed.

After generation, install NumPy/Pillow into a dedicated Python environment and validate the new output:

```sh
python3 assets/reference-source/verify_assets.py --assets work/new-reference-build --reports work/new-reference-check
npm --prefix assets/reference-source install
node assets/reference-source/validate_khronos.cjs work/new-reference-build work/new-reference-check/khronos-validation.json
```

The validator package pins Khronos glTF Validator 2.0.0-dev.3.10. To check the app's existing models and editor state without rebuilding assets, run the repository's `npm test`. Geometry tests do not certify GPU appearance, manufacturer equivalence or real-world assembly/safety.
