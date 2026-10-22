import fs from 'node:fs';
const dir='content/coin-history/fort-vancouver-centennial-half-dollar/stock';fs.mkdirSync(dir,{recursive:true});
for (const query of ['forest river','woodworking hand tools']) {
 const response=await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=6`,{headers:{Authorization:process.env.PEXELS_API_KEY}});
 if(!response.ok)throw Error(`Stock search failed ${response.status}`);
 const data=await response.json();fs.writeFileSync(`${dir}/${query.replaceAll(' ','-')}-search.json`,JSON.stringify(data));
 console.log(JSON.stringify(data.videos.map(v=>({id:v.id,url:v.url,duration:v.duration,image:v.image,files:v.video_files.filter(f=>f.file_type==='video/mp4').map(f=>({width:f.width,height:f.height,id:f.id}))}))));
}
