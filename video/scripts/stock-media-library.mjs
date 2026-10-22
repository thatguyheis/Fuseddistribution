import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync} from 'node:fs';
import {join} from 'node:path';
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const directory = root => join(root, 'video/local/stock-media');
const read = root => existsSync(join(directory(root), 'catalog.json')) ? JSON.parse(readFileSync(join(directory(root), 'catalog.json'))) : {version: 1, assets: []};
const save = (root, catalog) => {mkdirSync(directory(root), {recursive:true}); writeFileSync(join(directory(root), 'catalog.json'), JSON.stringify(catalog,null,2)+'\n');};

export function registerStockMedia({root, path, provenance, query, topic, slug, segmentIndex, type}) {
  const catalog=read(root), sha256=hash(path), id=`stock-${sha256.slice(0,20)}`;
  let asset=catalog.assets.find(item=>item.id===id);
  if(!asset){
    const filename=`${id}.${type==='video'?'mp4':'jpg'}`;
    mkdirSync(join(directory(root),'assets'),{recursive:true});
    copyFileSync(path,join(directory(root),'assets',filename));
    asset={id,filename,sha256,type,query,topic,...provenance,status:'pending-visual-review',uses:[],createdAt:new Date().toISOString()};
    catalog.assets.push(asset);
  }
  asset.uses.push({slug,segmentIndex,at:new Date().toISOString()});save(root,catalog);return id;
}

export function reuseStockMedia({root, query, topic, type, destination, excludeIds=[]}) {
  const catalog=read(root);
  const asset=catalog.assets.find(item=>item.status==='approved-supporting-imagery' && item.query===query && item.topic===topic && item.type===type && !excludeIds.includes(item.id) && existsSync(join(directory(root),'assets',item.filename)));
  if(!asset)return null;
  const source=join(directory(root),'assets',asset.filename);
  if(hash(source)!==asset.sha256)throw new Error('Stock library hash mismatch');
  copyFileSync(source,destination);return asset;
}

// Called only after the normal exact-MP4 visual and release gates succeed.
export function approveStockMediaForReel(root,slug) {
  const manifestPath=join(root,'video/out',slug,'media-manifest.json');
  if(!existsSync(manifestPath))return;
  const manifest=JSON.parse(readFileSync(manifestPath));const catalog=read(root);
  for(const [index, scene] of Object.entries(manifest.segments || {})) {
    const asset=catalog.assets.find(item=>item.id===scene.libraryAssetId);
    if(!asset)continue;
    const staged=join(root,'video/public',asset.type==='video'?'videos':'photos',slug,`segment-${index}.${asset.type==='video'?'mp4':'jpg'}`);
    if(existsSync(staged)&&hash(staged)===asset.sha256){asset.status='approved-supporting-imagery';asset.reviewedIn=slug;}
  }
  save(root,catalog);
}
