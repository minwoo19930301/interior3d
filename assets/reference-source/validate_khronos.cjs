// Optional official validator: input assets are never changed. Install the pinned
// gltf-validator dependency alongside this script, then pass assets and NEW report.
const fs=require('node:fs');
const path=require('node:path');
const validator=require('gltf-validator');
const [assets,reportPath]=process.argv.slice(2);
if(!assets||!reportPath)throw new Error('Usage: node validate_khronos.cjs ASSETS NEW_REPORT.json');
if(fs.existsSync(reportPath))throw new Error('Report must not already exist');
(async()=>{
  const files=fs.readdirSync(assets).filter(file=>file.endsWith('.glb')).sort();
  if(files.length!==19)throw new Error('Expected all 19 GLBs');
  const results=[];
  for(const file of files){
    const report=await validator.validateBytes(new Uint8Array(fs.readFileSync(path.join(assets,file))),{
      uri:file,maxIssues:2000,externalResourceFunction:()=>{throw new Error('External resources are not permitted');},
    });
    results.push({file,...report});
  }
  const errors=results.reduce((sum,report)=>sum+report.issues.numErrors,0);
  const warnings=results.reduce((sum,report)=>sum+report.issues.numWarnings,0);
  fs.writeFileSync(reportPath,JSON.stringify({validatorVersion:validator.version(),errors,warnings,results},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({count:files.length,errors,warnings}));
  process.exitCode=errors||warnings?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
