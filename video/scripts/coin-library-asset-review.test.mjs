import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {approveCoinLibraryAsset} from '../../scripts/review-coin-library-asset.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('catalog approval requires matching source hash and records local visual evidence', async () => {
  const root=mkdtempSync(join(tmpdir(),'coin-catalog-review-'));
  const raw=join(root,'Coin Raw');
  mkdirSync(raw,{recursive:true});
  const image=Buffer.from('cent photo');
  writeFileSync(join(raw,'cent.jpg'),image);
  const catalogPath=join(root,'content/coin-library/catalog.json');
  mkdirSync(join(root,'content/coin-library'),{recursive:true});
  writeFileSync(catalogPath,JSON.stringify({items:[{id:'coin-0048',source:'Coin Raw/cent.jpg',sha256:digest(image),status:'cataloged_requires_crop_review'}]}));
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({message:{content:JSON.stringify({matchesCoin:true,confidence:0.97,visibleEvidence:'Cent portrait and 1909 date'})}})});
  try {
    const record=await approveCoinLibraryAsset({root,assetId:'coin-0048',coinIdentity:'1909 Lincoln cent',identitySourceUrl:'https://www.usmint.gov/learn/coin-and-medal-programs/coin-specifications',visibleMarkers:'Lincoln portrait and 1909 date'});
    assert.equal(record.status,'approved_coin_history_evidence');
    assert.equal(record.identityReview.matchesCoin,true);
    assert.equal(record.identityReview.sourceSha256,digest(image));
    assert.equal(JSON.parse(readFileSync(catalogPath,'utf8')).items[0].coinIdentity,'1909 Lincoln cent');
  } finally { globalThis.fetch=originalFetch; }
});

test('catalog approval fails without verified visual match', async () => {
  const root=mkdtempSync(join(tmpdir(),'coin-catalog-review-'));
  const raw=join(root,'Coin Raw');
  mkdirSync(raw,{recursive:true});
  const image=Buffer.from('wrong coin');
  writeFileSync(join(raw,'coin.jpg'),image);
  const catalogPath=join(root,'content/coin-library/catalog.json');
  mkdirSync(join(root,'content/coin-library'),{recursive:true});
  writeFileSync(catalogPath,JSON.stringify({items:[{id:'coin-0049',source:'Coin Raw/coin.jpg',sha256:digest(image),status:'cataloged_requires_crop_review'}]}));
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({message:{content:JSON.stringify({matchesCoin:false,confidence:0.97,visibleEvidence:'Different design'})}})});
  try {
    await assert.rejects(approveCoinLibraryAsset({root,assetId:'coin-0049',coinIdentity:'1892 Columbian half dollar',identitySourceUrl:'https://www.usmint.gov/',visibleMarkers:'Columbus portrait'}),/not verified/);
    assert.equal(JSON.parse(readFileSync(catalogPath,'utf8')).items[0].status,'cataloged_requires_crop_review');
  } finally { globalThis.fetch=originalFetch; }
});
