import {readFileSync,writeFileSync} from 'node:fs';
import {validateImageReview} from '../../../video/scripts/coin-image-relevance.mjs';
const slug='2021-w-type-1-reverse-proof-explained',dir=`public/blog/${slug}`,work=`content/coin-history/${slug}`;
const assets=JSON.parse(readFileSync(`${dir}/image-sources.json`)).assets;
const reviews=[];
async function reviewCoinImage({imagePath,slug,topic,coinIdentity}) {
 const bytes=readFileSync(imagePath);
 const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',body:JSON.stringify({model:'gemma3:4b',stream:false,format:{type:'object',properties:{matchesCoin:{type:'boolean'},confidence:{type:'number'},visibleEvidence:{type:'string'},reason:{type:'string'}},required:['matchesCoin','confidence','visibleEvidence','reason'],additionalProperties:false},options:{temperature:0,num_predict:250},messages:[{role:'user',content:`Inspect the actual coin image. Topic: ${topic}. Coin: ${coinIdentity}. Decide whether this is a relevant view of the coin, including an obverse, reverse, or holder. Read visible evidence only. Holder attribution is not independent authentication. Return matchesCoin, confidence (0-1), visibleEvidence and reason. Do not guess invisible mintmarks or dates.`,images:[bytes.toString('base64')]}]})});
 const result=JSON.parse((await response.json()).message.content);
 const {createHash}=await import('node:crypto');
 const imageHash=createHash('sha256').update(bytes).digest('hex');
 const review={...result,slug,topic,coinIdentity,imageSha256:imageHash,model:'gemma3:4b',reviewedAt:new Date().toISOString()};
 validateImageReview(review,{slug,topic,coinIdentity,imageHash});return review;
}

for(const checkpoint of ['package-intake','pre-render']) {
 for(const asset of assets) {
  console.log(`Reviewing ${checkpoint}: ${asset.path}`);
  const review=await reviewCoinImage({imagePath:`${dir}/${asset.path}`,slug,topic:'Why This 2021 Silver Eagle Looks Different',coinIdentity:asset.coinIdentity});
  reviews.push({...review,source:asset.path,checkpoint});
  writeFileSync(`${work}/coin-image-relevance.json`,JSON.stringify({slug,checkpoint:checkpoint==='pre-render'?'package-intake-and-pre-render':'package-intake',reviews},null,2));
  console.log(`PASS ${review.confidence}: ${review.visibleEvidence}`);
 }
}
await fetch('http://127.0.0.1:11434/api/generate',{method:'POST',body:JSON.stringify({model:'gemma3:4b',keep_alive:0})});
