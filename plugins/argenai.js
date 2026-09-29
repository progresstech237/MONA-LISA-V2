const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/Argen';
const CATBOX = 'https://catbox.moe/user/api.php';

const MODELS = ['flux2_klein_fast','flux2_klein','realvis_lighting','dream_shape_lighting','juggernaut_lighting','redcraft_illustrious','ilustreal_illustrious','prefect_illustrious','prefectious_illustrious','illustrij_Illustrious','goddess_illustrious','perfectdeliberate_illustrious','samaritan_sdxl','guofeng_sdxl','disney_cartoon_sdxl','babes_illustrious','raemu_lighting','wai_Illustrious','redzimage_zimg'];
const ENGINES = ['wan2_2','hunyuan1_5','ltx2'];

async function uploadCatbox(buf){
  const f = new FormData(); f.append('reqtype','fileToUpload'); f.append('fileToUpload', buf, {filename: `argen_${Date.now()}.jpg`});
  const { data } = await axios.post(CATBOX, f, {headers: f.getHeaders()});
  if(typeof data==='string' && data.startsWith('http')) return data.trim();
  throw new Error('Upload fail');
}
async function getQuotedBuf(conn, mek, m){
  try{ const q=m.quoted||mek.message?.extendedTextMessage?.contextInfo?.quotedMessage; if(!q) return null; const k=Object.keys(q)[0]; return await conn.downloadMediaMessage({message:{[k]:q[k]}}); }catch{ return null; }
}
function parseFlags(t){ const fl={}; const re=/--(\w+)\s+([^\s]+)/g; let m; while((m=re.exec(t))!==null) fl[m[1].toLowerCase()]=m[2]; return {flags:fl, prompt:t.replace(/--\w+\s+[^\s]+/g,'').trim()}; }
async function callArgen(p){
  try{ // try GET first like your screenshot
    const {data}=await axios.get(API,{params:p,timeout:120000}); return data;
  }catch{ // fallback POST
    const {data}=await axios.post(API,p,{timeout:120000}); return data;
  }
}

// ===== HUB =====
cmd({ pattern: "argen", alias: ["argenmenu"], react: "🎨", desc: "Argen AI Hub Menu", category: "ai", filename: __filename },
async (conn, mek, m, { from, q, reply })=>{
  if(q && q.length>4 && !['models','img','image','video'].includes(q.split(' ')[0])){
    const {prompt}=parseFlags(q); if(prompt.length>3){
      await conn.sendMessage(from,{react:{text:"⏳",key:mek.key}});
      const res=await callArgen({action:'image',prompt,modelId:'flux2_klein_fast',ratio:'1:1',raw:'false'});
      const url=res?.data?.imageUrl||res?.imageUrl; 
      return conn.sendMessage(from,{image:{url},caption:`*ARGEN QUICK*\n${prompt}\n> .argen for menu`},{quoted:mek});
    }
  }
  if((q||'').toLowerCase().startsWith('model')){
    const r=await callArgen({action:'models'}).catch(()=>null);
    return reply(`*📋 19 MODELS + 3 ENGINES*\n\n${MODELS.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nENGINES: ${ENGINES.join(', ')}\nRATIOS: 1:1,16:9,9:16,4:3\n\nLIVE: ${r?'API online ✅':'fallback list'}`);
  }
  const menu=`╭─ *🎨 ARGEN - LIVE ✅* ─
│ DroodStudio • 19 img + 3 vid
│ Endpoint: /api/ai/Argen
│
├─ *COMMANDS*
│ • .argen → This menu
│ • .imagine <prompt> → Image
│ • .argenvideo <prompt> → Video
│ • .argen models → List models
│
├─ *IMAGE EXAMPLE*
│ .imagine a cat at sunset, cinematic --model flux2_klein_fast --ratio 16:9
│
├─ *VIDEO EXAMPLE*
│ .argenvideo a cat dancing --engine wan2_2 --res 720p --duration 5
│ Reply to image = image2video
│
├─ *FLAGS*
│ --model flux2_klein_fast
│ --ratio 1:1/16:9/9:16
│ --neg blurry, low quality
│ --engine wan2_2
│ --type text2video/image2video
│ --res 720p --duration 5
│
╰─ API 100% LIVE TESTED 👌`;
  await conn.sendMessage(from,{image:{url:'https://files.catbox.moe/4dwiou.png'},caption:menu},{quoted:mek});
});

// ===== IMAGE =====
cmd({ pattern: "agenimg", alias: ["agenimg"], react: "✨", desc: "Argen Image Gen", category: "ai", filename: __filename },
async (conn, mek, m, { from, q, reply })=>{
  try{
    if(!q && !m.quoted) return reply('Usage: .imagine a cat on beach --model flux2_klein_fast --ratio 1:1\n. argen for menu');
    const {flags,prompt}=parseFlags(q||''); const finalPrompt=prompt||'a cat walking on beach at sunset, cinematic';
    const modelId=flags.model||'flux2_klein_fast'; const ratio=flags.ratio||'1:1'; const negativePrompt=flags.neg||'';
    await conn.sendMessage(from,{react:{text:"⏳",key:mek.key}});
    let imageUrl=''; const buf=await getQuotedBuf(conn,mek,m); if(buf) imageUrl=await uploadCatbox(buf);
    const res=await callArgen({action:'image',prompt:finalPrompt,modelId,ratio,negativePrompt,raw:'false',...(imageUrl?{imageUrl}:{})});
    const out=res?.data?.imageUrl||res?.imageUrl||res?.data?.url||res?.url;
    if(!out) throw new Error(JSON.stringify(res).slice(0,500));
    await conn.sendMessage(from,{image:{url:out},caption:`*🎨 ${modelId} | ${ratio}*\n${finalPrompt}\n> ${res?.attribution||'@Omegatech-01'}`},{quoted:mek});
  }catch(e){ reply('❌ '+ (e.message)); }
});

// ===== VIDEO =====
cmd({ pattern: "argenvideo", alias: ["agenvid","agvideo"], react: "🎬", desc: "Argen Video Gen", category: "ai", filename: __filename },
async (conn, mek, m, { from, q, reply })=>{
  try{
    if(!q && !m.quoted) return reply('Usage: .argenvideo cat walking --engine wan2_2 --res 720p --duration 5\nReply to image = image2video');
    const {flags,prompt}=parseFlags(q||''); const finalPrompt=prompt||'a cat walking on beach at sunset, cinematic';
    let engine=flags.engine||'wan2_2'; let videoType=flags.type||'text2video'; let videoDuration=flags.duration||'5'; let videoResolution=flags.res||'720p';
    await conn.sendMessage(from,{react:{text:"⏳",key:mek.key}});
    let imageUrl=''; const buf=await getQuotedBuf(conn,mek,m); if(buf){ imageUrl=await uploadCatbox(buf); videoType='image2video'; }
    const res=await callArgen({action:'video',prompt:finalPrompt,engine,videoType,videoDuration,videoResolution,modelId:flags.model||'flux2_klein_fast',raw:'false',...(videoType==='image2video'?{imageUrl}:{})});
    const out=res?.data?.videoUrl||res?.data?.imageUrl||res?.videoUrl||res?.imageUrl;
    if(!out) throw new Error(JSON.stringify(res).slice(0,500));
    if(out.includes('.mp4')) await conn.sendMessage(from,{video:{url:out},caption:`*🎬 ${engine} ${videoDuration}s ${videoResolution}*\n${finalPrompt}`},{quoted:mek});
    else await conn.sendMessage(from,{image:{url:out},caption:`*VIDEO PREVIEW*\n${finalPrompt}\n${out}`},{quoted:mek});
  }catch(e){ reply('❌ Video: '+e.message); }
});
