import fs from 'node:fs';import {createHash} from 'node:crypto';import {registerStockMedia} from '../../../video/scripts/stock-media-library.mjs';
const slug='fort-vancouver-centennial-half-dollar',dir=`content/coin-history/${slug}/stock`;
for(const [query,id,name,index] of [['forest river',9908019,'river',1],['woodworking hand tools',5972923,'woodcraft',2]]){
 const data=JSON.parse(fs.readFileSync(`${dir}/${query.replaceAll(' ','-')}-search.json`));const v=data.videos.find(v=>v.id===id);const f=v.video_files.find(f=>f.file_type==='video/mp4'&&f.width===1080);if(!f)throw Error('Full HD stock unavailable');
 const path=`${dir}/${name}.mp4`;if(!fs.existsSync(path)){const r=await fetch(f.link);if(!r.ok)throw Error(`Download failed ${r.status}`);fs.writeFileSync(path,Buffer.from(await r.arrayBuffer()));}
 const provenance={provider:'pexels',providerId:id,sourceUrl:v.url,creator:v.user.name,licenseUrl:'https://www.pexels.com/license/',licenseReviewed:'2026-10-13',usage:'Modern illustrative footage, not Fort Vancouver or historical footage'};
 const libraryAssetId=registerStockMedia({root:process.cwd(),path,provenance,query,topic:'silver',slug,segmentIndex:index,type:'video'});
 fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify({...provenance,libraryAssetId,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex'),width:f.width,height:f.height,duration:v.duration},null,2));console.log(name,libraryAssetId);
}
