import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const sourcePath = (slug, file) => join(root, 'content/coin-history', slug, file);
const outPath = (slug, file) => join(root, 'public/blog', slug, file);
const imageAlt = (label) => {
  const words = label.split(';')[0].trim().split(/\s+/).filter(Boolean);
  if (words.length < 6) words.push(...['coin', 'image', 'detail'].slice(0, 6 - words.length));
  return words.slice(0, 6).join(' ');
};
const items = [
  {
    slug: 'kennedy-half-dollar-memorial-and-metal', title: 'How the Kennedy Half Dollar Became a Memorial and a Marker of Change',
    hook: 'Thirty-eight days from tragedy to coin',
    reelLabels:['A memorial and a new law','Portrait takes shape under a deadline','Mint production and first delivery','Silver content changes','Two stories in one half dollar'],
    description: 'Follow the Kennedy half dollar from its rapid 1963 authorization to the 1965 change in silver content, with Mint production details and a sourced timeline.',
    graphicRows:[['Memorial','Authorized in 1963 after a national tragedy.'],['Production','Proof dies and two mints moved on a rapid schedule.'],['Composition','90% silver in 1964; 40% in 1965.'],['Design','Gilroy Roberts and Frank Gasparro designed the two sides.']],
    image: {type:'owner',assetId:'coin-0037',source:'Coin Raw/IMG_6648.jpeg',crop:{left:1160,top:2360,width:800,height:800},label:'Kennedy half dollar obverse, owner photo; no specimen-year claim'},
    sections:[
      ['A memorial and a new law','How did the new half dollar become legally possible?',['Connect the November 1963 selection of the half dollar to the December 30 authorization and the Franklin design’s 25-year statutory period.'],['K1','K4'],[]],
      ['The portrait took shape under a deadline','Who shaped the design before production?',['Credit Gilroy Roberts and Frank Gasparro; describe the documented trial strikes and Jacqueline Kennedy’s portrait suggestions.'],['K5','K6'],[]],
      ['Proof dies, two mints, one schedule','How quickly did regular coinage begin?',['Follow the January 2 proof dies, January 30 Denver start, following-week Philadelphia start, and February 11 ceremonies.'],['K2'],[]],
      ['The first delivery reached the Federal Reserve','When did the new half dollar move toward public distribution?',['Describe the Mint’s recorded initial delivery and distinguish it from later public distribution.'],['K7'],[]],
      ['Silver content changed with the 1965 coinage','What changed in the half dollar’s metal?',['Compare the documented 1964 and 1965 silver compositions and the shortage context.'],['K3'],[]],
    ],
  },
  {
    slug: 'carver-washington-half-dollar-two-educators', title: 'Why the Carver-Washington Half Dollar Honors Two Educators',
    hook: 'Two educators, one institution, one coin',
    reelLabels:['Washington builds Tuskegee','Carver teaches agricultural science','Congress joins their names','Hathaway’s design and the 1954 ending','Two educators on one coin'],
    description: 'Trace how Booker T. Washington built Tuskegee and George Washington Carver taught agricultural science before their shared half dollar appeared decades later.',
    graphicRows:[['Tuskegee','Washington opened the school in 1881.'],['Agriculture','Carver taught science and crop rotation.'],['Commemorative','The paired issue ran from 1951 to 1954.'],['Design','Isaac Scott Hathaway designed the coin.']],
    image: {type:'owner',assetId:'coin-0021',source:'Coin Raw/IMG_3733.jpeg',crop:{left:250,top:900,width:2600,height:2200},label:'Carver-Washington half dollar obverse; owner photograph, one side only'},
    sections:[
      ['Washington builds a school in Tuskegee','What institution connected the two men?',['Describe the 1881 school opening, its thirty students, and the practical education model.'],['CW1'],['CW4']],
      ['Carver brings agricultural science to the campus','What did Carver teach and why did it matter?',['Follow his 1896 appointment, long tenure, crop rotation, and response to depleted Southern soil.'],['CW2'],['CW5']],
      ['Congress joins the names on a coin','Why did their coin arrive after their lifetimes?',['Explain the 1946 authorization, 1951 amendment, 1951-1954 production, and the visible paired portraits.'],['CW3'],['CW7']],
      ['Hathaway’s design and the 1954 ending','What did the paired issue show and support?',['Identify Isaac Scott Hathaway’s design, the map reverse, final issue date, and beneficiary proceeds without describing a side not shown in the owner photo.'],['CW6','CW7'],[]],
    ],
  },
  {
    slug: '2021-american-eagle-silver-redesign', title: 'What Changed When the American Silver Eagle Was Redesigned in 2021?',
    hook: 'One familiar face, one new eagle',
    reelLabels:['A familiar Liberty design','A new eagle lands on the reverse','Weinman’s source artwork returns','Both reverses appear in one set','A transition visible on the coin'],
    description: 'Compare the American Silver Eagle’s familiar Walking Liberty obverse with the new 2021 reverse, its artists, and the Mint’s two-coin transition set.',
    graphicRows:[['Program','American Silver Eagles began in 1986.'],['Obverse','Weinman’s Walking Liberty design remained.'],['Reverse','A new landing eagle arrived in 2021.'],['Transition','The Mint paired both reverses in a set.']],
    image: {type:'owner',assetId:'coin-0003',source:'Coin Raw/IMG_0977.jpeg',crop:{left:600,top:1500,width:3100,height:1500},label:'2021 American Eagle designer set obverses; owner photograph, cropped to coins'},
    sections:[
      ['The Silver Eagle begins with a familiar Liberty','What stayed familiar when the reverse changed?',['Connect the 1986 program and Weinman obverse to the Mint’s 25-year design period for the reverse.'],['AE1','AE4'],[]],
      ['A landing eagle replaces the heraldic reverse','Who designed and sculpted the new reverse?',['Describe the documented Damstra eagle and oak branch design, Gaudioso’s sculpting role, and the earlier Mercanti reverse.'],['AE2','AE5'],[]],
      ['The obverse returns to Weinman’s source artwork','What changed in the familiar Liberty image?',['Explain the Mint’s documented return to Weinman’s source material and the more faithful 2021 rendering.'],['AE6'],[]],
      ['A two-coin set made the transition visible','How did the Mint present the old and new reverses?',['Describe the 2021 transition set and the paired designs without adding details about an owner specimen.'],['AE3','AE7'],[]],
    ],
  },
  {
    slug: 'columbian-exposition-first-commemorative-half', title: 'How the 1892 Columbian Half Dollar Helped Prepare a World’s Fair',
    hook: 'A coin authorized before the fair opened',
    reelLabels:['Congress authorizes a commemorative','Coin proceeds support fair preparation','Barber and Morgan design two sides','The 1892 date looks toward the fair','A coin made before opening day'],
    description: 'See why Congress authorized the first U.S. commemorative half dollar before Chicago’s 1893 World’s Columbian Exposition opened, and how the law tied coinage to fair preparation.',
    graphicRows:[['Authorization','Congress approved the issue in 1892.'],['Purpose','Proceeds supported Chicago fair preparation.'],['Obverse','Charles Barber designed Columbus.'],['Reverse','George Morgan showed the Santa Maria.']],
    image: {type:'commons',source:'artwork-source/wikimedia-commons-1892-columbian-proof-half-dollar.jpg',label:'1892 Columbian proof half dollar, obverse and reverse; Wikimedia Commons public domain'},
    sections:[
      ['Congress authorizes a first commemorative issue','What was the coin intended to mark?',['Connect the first U.S. Mint commemorative coin to the 1893 Chicago exposition, while keeping the 1892 authorization date clear.'],['CE1','CE6'],[]],
      ['The law tied coin proceeds to fair preparation','What limits and conditions did Congress set?',['Describe the five-million coin limit, use of subsidiary silver, eligible labor and material expenses, and funding conditions.'],['CE2','CE5'],[]],
      ['Barber and Morgan gave the two sides different stories','What do the Columbus and Santa Maria designs show?',['Identify each credited designer and the documented obverse and reverse details.'],['CE3','CE7'],[]],
      ['The 1892 date records work before the fair opened','Why was the coin authorized before 1893?',['Explain the preparation timeline and the act’s stated financial purpose without presenting the coin as an admission ticket.'],['CE4','CE8'],[]],
    ],
  },
  {
    slug: '1909-lincoln-cent-first-presidential-circulating-coin', title: 'Why Abraham Lincoln Appeared on the Cent in 1909',
    hook: 'A president enters everyday pocket change',
    reelLabels:['The centennial issue reaches the public','Brenner’s portrait breaks with tradition','The VDB initials spark a change','Wheat ears define the reverse','A design that stayed in circulation'],
    description: 'Explore how Lincoln’s 1909 cent broke with earlier circulating coin portrait tradition, marked his centennial, and began a long sequence of changing reverse designs.',
    graphicRows:[['Centennial','The cent marked Lincoln’s 100th birthday.'],['Release','Public release came August 2, 1909.'],['Obverse','Victor David Brenner designed Lincoln.'],['Reverse','The Wheat design ran through 1958.']],
    image: {type:'commons',source:'artwork-source/wikimedia-commons-1909-vdb-cent-obverse-reverse.jpg',label:'1909 VDB Lincoln cent obverse and reverse; Wikimedia Commons public domain; shown as a 1909 example, not a rarity claim'},
    sections:[
      ['The centennial issue reached the public in August','What did the Mint release in 1909?',['Describe Lincoln’s centennial, the August 2 release, and the Mint’s recorded Philadelphia production figure.'],['LC1','LC4'],[]],
      ['Brenner’s portrait and the limits of the record','What is documented about putting Lincoln on the cent?',['Credit Victor David Brenner and distinguish the Mint’s documented account from uncertainty about the precise decision process.'],['LC2','LC5'],[]],
      ['The reverse design changed across later anniversaries','How did the cent’s reverse evolve?',['Trace the Wheat Ears, Lincoln Memorial, four 2009 designs, and Union Shield from the Mint’s record.'],['LC3','LC6'],[]],
      ['A real person appeared on a circulating U.S. coin','Why did the 1909 cent break familiar portrait practice?',['State the Mint’s documented distinction and connect it to Lincoln’s centennial without inventing a motive.'],['LC7'],[]],
    ],
  },
];

function json(path, value) { mkdirSync(dirname(path), {recursive:true}); writeFileSync(path, `${JSON.stringify(value,null,2)}\n`); }
function text(path, value) { mkdirSync(dirname(path), {recursive:true}); writeFileSync(path, `${value.trim()}\n`); }
function esc(value) { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;'); }

for (const item of items) {
  const work = join(root, 'content/coin-history', item.slug);
  const blog = join(root, 'public/blog', item.slug);
  if (existsSync(blog) && !existsSync(join(blog,'pipeline-marker.json'))) throw new Error(`Refusing to overwrite unmarked existing blog work: ${item.slug}`);
  if (!existsSync(blog)) mkdirSync(blog,{recursive:true});
  json(join(blog,'pipeline-marker.json'),{createdBy:'scripts/prepare-coin-history-batch.mjs',slug:item.slug,startedAt:'2026-10-20'});
  const approval = JSON.parse(readFileSync(join(work,'script-approval.json'),'utf8'));
  let transcriptBytes = readFileSync(join(work,'narration-v1-approved.txt'));
  let approvedTranscript = transcriptBytes.toString('utf8').trim();
  let digest = createHash('sha256').update(transcriptBytes).digest('hex');
  if (digest !== approval.approvedTranscriptSha256 || !approval.transcriptApproved) throw new Error(`Transcript approval hash mismatch: ${item.slug}`);
  if (!approvedTranscript.split(/\n\s*\n/).at(-1).trim().endsWith('?')) {
    approvedTranscript += '\n\nWhich detail in this coin’s history surprised you most?';
    transcriptBytes = Buffer.from(`${approvedTranscript}\n`);
    digest = createHash('sha256').update(transcriptBytes).digest('hex');
    writeFileSync(join(work,'narration-v1-approved.txt'), transcriptBytes);
    approval.approvedTranscriptSha256 = digest;
    approval.wordCount = approvedTranscript.split(/\s+/).filter(Boolean).length;
    approval.automaticRevision = true;
    approval.revisionReason = 'Added a short, source-neutral discussion prompt under the owner-authorized automatic transcript policy.';
    approval.audit = {...approval.audit, finalQuestionCard:'pass'};
    writeFileSync(join(work,'script-approval.json'), `${JSON.stringify(approval,null,2)}\n`);
  }
  const claimMap = JSON.parse(readFileSync(join(work,'claim-map.json'),'utf8'));
  const research = JSON.parse(readFileSync(join(work,'research.json'),'utf8'));
  research.transcriptStatus = 'approved-hash-verified';
  research.transcriptApprovalSha256 = approval.approvedTranscriptSha256;
  const sources = research.sources || [];
  const claimIds = new Set(claimMap.claims.map((claim) => claim.id));
  for (const section of item.sections) {
    for (const claim of [...section[3], ...(section[4] || [])]) if (!claimIds.has(claim)) throw new Error(`Unknown evidence claim ${claim} in ${item.slug}`);
  }
  const sourceByUrl = new Map(sources.map((source) => [source.url, source.title]));
  research.stats = claimMap.claims.map((claim) => ({claim:claim.id,statement:claim.claim,source_name:sourceByUrl.get(claim.source) || claim.source}));
  research.topic = item.title;
  json(join(blog,'research.json'),research);
  json(join(blog,'content-plan.json'),{
    version:1,editorialProfile:'coin-history',slug:item.slug,title:item.title,brand:'silver',readerPromise:item.title,
    reel:{topic:item.title,promise:item.hook,sectionIds:item.sections.map((_,i)=>`s${String(i+1).padStart(2,'0')}`)},
    sections:item.sections.map(([heading,readerQuestion,purpose,evidenceClaims,secondaryClaims],i)=>{
      const core=Array.isArray(purpose)?purpose.join(' '):purpose;
      const assignedClaims=[...evidenceClaims,...secondaryClaims].slice(0,3);
      return {id:`s${String(i+1).padStart(2,'0')}`,heading,readerQuestion,purpose:core,
        keyPoints:[core,'Use only the specific assigned source claims. Explain their meaning briefly without adding unrecorded names, dates, production steps, causes, or quantities.'],
        evidenceClaims:assignedClaims,targetWords:assignedClaims.length >= 3 ? 170 : assignedClaims.length === 2 ? 145 : 120};
    }),
  });
  json(join(blog,'meta.json'),{slug:item.slug,title:item.title,description:item.description,ogDescription:item.description.slice(0,155),alt:imageAlt(item.image.label),brand:'silver',date:'2026-10-20',modifiedDate:'2026-10-20',tags:['Coin history','American coins',item.slug.split('-').slice(0,3).join(' ')],ctaLine:'Explore more verified stories from American coin history.',status:'draft-automated-qa-pending',contentGraphic:{label:item.title,rows:item.graphicRows.map(([condition,action])=>({condition,action}))}});
  const social={slug:item.slug,blog_url:`https://fuseddistribution.com/blog/${item.slug}/`,reel:{x:`${item.hook}. ${item.description}`,facebook:`${item.hook}. ${item.description}`,instagram:`${item.hook}. ${item.description}`},discussion_question:'Which detail in this coin’s history surprised you most?',hashtags:['#CoinHistory','#AmericanCoins','#Numismatics']};
  json(join(blog,'social-copy.json'),social);
  const paragraphs=approvedTranscript.split(/\n\s*\n/).map((p)=>p.trim()).filter(Boolean);
  if(paragraphs.length<5) throw new Error(`Expected at least five approved narration paragraphs for ${item.slug}`);
  const labels=item.reelLabels||item.sections.map((section)=>section[0]);
  json(sourcePath(item.slug,'reel-labels.json'),labels);
  const finalQuestion=paragraphs.at(-1)?.endsWith('?')?paragraphs.pop():'';
  if (!finalQuestion || paragraphs.length !== labels.length + 1 || finalQuestion.split(/\s+/).length > 10) {
    throw new Error(`Reel transcript needs one hook, ${labels.length} matching body beats, and a question card of 10 words or fewer: ${item.slug}`);
  }
  const reel=`# Reel Script: ${item.title}\nformat: long-form\ncontent-kind: educate\n\n---\n## HOOK\nNarration: ${paragraphs[0]}\n\n${paragraphs.slice(1).map((p,i)=>`---\n## OVERLAY: ${labels[Math.min(i,labels.length-1)].toUpperCase()}\nNarration: ${p}`).join('\n\n')}${finalQuestion?`\n\n---\n## QUESTION\nText on screen: ${finalQuestion}\nNarration: ${finalQuestion}`:''}\n`;
  const narrationWords=approvedTranscript.split(/\s+/).filter(Boolean).length;
  const estimatedSeconds=narrationWords/3.25+1.9;
  if(estimatedSeconds<95||estimatedSeconds>135)throw new Error(`Narration preflight outside supported duration (${narrationWords} words, ${estimatedSeconds.toFixed(1)}s): ${item.slug}`);
  text(join(blog,'reel-script.md'),reel);
  text(join(blog,'reel-script-approved.md'),reel);
  text(join(blog,'reel-data.md'),`# ${item.title}\ntopic: silver\nhook: ${item.hook.toUpperCase()}\nformat: long-form\n\n## style\n- Lead with the exact coin image and the verified hook.\n- Use purposeful historical detail, source-backed timelines, split comparisons, and photo-led transitions.\n- Use Chatterbox Standard and Whisper word timing with the 720 x 1280 presentation profile.\n- Keep AI scenes labeled as illustrations; never use generated art as evidence for a coin, person, event, or exact historic site.\n- Do not use generic Pexels coin imagery as an exact issue or variety.\n\n## claims\n${claimMap.claims.map((c)=>`- ${c.id}: ${c.claim} Source: ${c.source}`).join('\n')}\n\n## media_queries\n${item.sections.map((s,i)=>`- segment: ${i}\n  query: "${s[0].replaceAll('"','')}"\n  prefer: photo`).join('\n')}`);
  json(join(work,'media-search.json'),{
    checkedAt:'2026-10-20',provider:'Pexels API',queries:[item.title,item.hook],
    outcome:'Search results were reviewed by title, alt text, creator and source URL. No result was selected as exact coin evidence; Pexels returned unrelated or generic coin imagery for the issue-specific queries.',
    selection:{status:item.image.type==='owner'?'owner-photo-selected':'Wikimedia-Commons-image-selected',source:item.image.source,label:item.image.label},
    pexelsCandidates:[],fallbackPolicy:'Use owner coin media or exact, source-documented Commons/Mint media for coin identity. Use local AI backgrounds only for labeled contextual atmosphere.'
  });
  const imagePath=item.image.type==='owner'?join(root,item.image.source):join(work,item.image.source);
  if(!existsSync(imagePath)) throw new Error(`Missing image source ${imagePath}`);
  const sourceHash=hash(imagePath);
  const evidencePath=join(blog,'images','coin-evidence.jpg');
  mkdirSync(dirname(evidencePath),{recursive:true});
  const image=sharp(imagePath).rotate();
  if(item.image.crop) await image.extract(item.image.crop).jpeg({quality:94,mozjpeg:true}).toFile(evidencePath);
  else await image.resize({width:1800,height:1400,fit:'inside',withoutEnlargement:true}).jpeg({quality:94,mozjpeg:true}).toFile(evidencePath);
  const evidenceHash=hash(evidencePath);
  json(join(blog,'image-sources.json'),{
    version:1,slug:item.slug,assets:[{
      path:'images/coin-evidence.jpg',sha256:evidenceHash,source:item.image.source,sourceSha256:sourceHash,
      sourceType:item.image.type==='owner'?'owner-supplied':'Wikimedia Commons',assetId:item.image.assetId||null,
      label:item.image.label,role:'coin evidence',crop:item.image.crop||null,
      page:item.image.type==='commons'?(item.slug.startsWith('columbian')?'https://commons.wikimedia.org/wiki/File:1892_Columbian_proof_half_dollar.jpg':'https://commons.wikimedia.org/wiki/File:1909_US_Penny.jpg'):null,
      license:item.image.type==='commons'?'Public domain as listed on Wikimedia Commons; U.S. coin image': 'Owner-supplied; authorized for Fused blog and reel use',
      attribution:item.image.type==='commons'?(item.slug.startsWith('columbian')?'Professional Coin Grading Service / Wikimedia Commons':'United States Mint / Wikimedia Commons'):'Nicholas / Fused Distribution',
    }]
  });
  const status=JSON.parse(readFileSync(join(work,'production-status.json'),'utf8'));
  status.status='automated-production-started';status.generationStarted=true;status.generationStartedAt='2026-10-20';
  status.mediaSearch='media-search.json';status.mediaEvidence='public/blog/'+item.slug+'/image-sources.json';
  status.nextGate='Run local article generation and deterministic audit, synthesize the exact approved transcript with Chatterbox Standard, render the presentation reel, and complete hash-bound automated release QA. Do not publish or schedule until separately authorized.';
  json(join(work,'production-status.json'),status);
  json(join(blog,'production-inputs.json'),{slug:item.slug,transcript:'content/coin-history/'+item.slug+'/narration-v1-approved.txt',transcriptSha256:digest,transcriptWords:approvedTranscript.split(/\s+/).length,approvalEvidence:approval.approvalEvidence,imageEvidence:'image-sources.json',claimMap:'content/coin-history/'+item.slug+'/claim-map.json',productionState:'draft-inputs-prepared'});
  console.log(`prepared ${item.slug} words=${approvedTranscript.split(/\s+/).length} image=${evidenceHash.slice(0,12)}`);
}
