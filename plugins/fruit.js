const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "fruit",
  alias: ["fruitninja","ninjafruit","slice","fruitslice"],
  react: "🍉",
  desc: "Fruit Ninja - Slice Combo",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.fruitLimit=global.fruitLimit||{}; const now=Date.now();
if(global.fruitLimit[from]&&now-global.fruitLimit[from]<8000) return reply(`⏳ ${Math.ceil((8000-(now-global.fruitLimit[from]))/1000)}s cooldown`);
global.fruitLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#3a1a5a,#0a0a14 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#ff7ad7;text-shadow:0 0 12px #ff7ad788;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#b88ab8}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(255,122,215,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#b88ab8}
.hr b{font:900 12px 'Arial Black';color:#ff7ad7}
.mbtn{width:30px;height:30px;border:1px solid rgba(255,122,215,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(255,122,215,.35);border-radius:14px;overflow:hidden;background:radial-gradient(ellipse at 50% 20%,#2a2a4a,#0a0a14);box-shadow:0 0 22px rgba(255,122,215,.18);aspect-ratio:404/620}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.pd{height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 11px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#modeB{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
#bombB{background:linear-gradient(#ff5a5a,#a01a1a 60%,#4a0a0a)}
.hint{text-align:center;font:600 8px Arial;color:#b88ab8;margin-top:4px}
</style>
<div id="app">
<div class="hdr"><div class="tt">🍉 FRUIT NINJA<small>SLICE EDITION</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>LIVES</i><b id="lv">❤️❤️❤️</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="404" height="620"></canvas></div>
<div class="pads"><button class="pd" id="modeB">🌀 CLASSIC MODE</button><button class="pd" id="bombB">💣 BOMB MODE: <span id="bombTxt">ON</span></button></div>
<div class="hint">Swipe fast to slice • Don't miss 3 fruits • Don't slice bombs 💣 • Combo x3+ = bonus</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), W=404, H=620, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), lvEl=document.getElementById('lv');
let BEST=0; try{BEST=parseInt(localStorage.getItem('fruit_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('fruit_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime,o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.value=f; g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.02);}catch(e){}}
function noiz(d,v){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime,len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(); s.buffer=b; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.02);}catch(e){}}
const SFX={ slice:()=>{tone(800,.06,'sawtooth',.12); tone(1200,.08,'square',.08);}, splash:()=>{noiz(.15,.18); tone(300,.12,'sine',.1);}, bomb:()=>{noiz(.4,.32); [200,120,60].forEach((f,i)=>setTimeout(()=>tone(f,.2,'sawtooth',.18),i*70));}, combo:()=>{[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>tone(f,.1,'sine',.12),i*50));} };
let state='ready', score=0, lives=3, frame=0, shake=0, overT=0, combo=0, comboT=0, fruits=[], halves=[], splashes=[], slash=[], bombMode=true;
function reset(){ score=0; lives=3; fruits=[]; halves=[]; splashes=[]; slash=[]; combo=0; comboT=0; frame=0; shake=0; scEl.textContent='0'; lvEl.textContent='❤️❤️❤️'; }
reset();
const FRUITS=[{n:'🍉',c:'#ff3b3b',j:'#1a8a0a'},{n:'🍎',c:'#ff1a1a',j:'#5a1a1a'},{n:'🍊',c:'#ff8a1a',j:'#ffcc8a'},{n:'🍋',c:'#ffd71a',j:'#fff8a0'},{n:'🍓',c:'#ff2a6a',j:'#ff8aab'},{n:'🥝',c:'#7ac74f',j:'#4a5a0a'}];
function spawnWave(){
 let count= 1+Math.floor(Math.random()* (score>200?4:3));
 for(let i=0;i<count;i++){
  setTimeout(()=>{
   let isBomb= bombMode && Math.random()<0.18;
   let ftype= isBomb? {n:'💣',c:'#222',j:'#ff5a5a',bomb:true} : FRUITS[Math.floor(Math.random()*FRUITS.length)];
   fruits.push({x:40+Math.random()*(W-80), y:H+30, vx:(Math.random()-0.5)*4, vy:-11-Math.random()*5 - score*0.01, rot:Math.random()*6, vr:(Math.random()-0.5)*0.2, r:22+Math.random()*8, type:ftype, sliced:false, life:1});
  }, i*120);
 }
}
let nextWave=0;
function update(){
 frame++; if(shake>0)shake*=0.88; if(comboT>0)comboT--; else combo=0;
 if(state!=='play') return;
 if(frame>nextWave){ spawnWave(); nextWave=frame+ 50+Math.random()*40 - Math.min(30,score*0.08); }
 fruits.forEach(f=>{
  f.x+=f.vx; f.y+=f.vy; f.vy+=0.22; f.rot+=f.vr;
  if(f.y>H+60 &&!f.sliced){
   if(!f.type.bomb){ lives--; SFX.bomb(); shake=6; if(lives<=0) die(); lvEl.textContent='❤️'.repeat(lives)+'🖤'.repeat(3-lives); }
   f.life=0;
  }
 });
 fruits=fruits.filter(f=>f.life>0 && f.y<H+80);
 halves.forEach(h=>{ h.x+=h.vx; h.y+=h.vy; h.vy+=0.22; h.rot+=h.vr; h.life-=0.02; });
 halves=halves.filter(h=>h.life>0);
 splashes.forEach(s=>{ s.life-=0.03; s.r+=0.8; });
 splashes=splashes.filter(s=>s.life>0);
 if(slash.length>1) slash.forEach(p=>p.life-=0.06);
 slash=slash.filter(p=>p.life>0);
}
function die(){ state='dead'; overT=performance.now(); shake=14; SFX.bomb(); if(score>BEST){BEST=score; try{localStorage.setItem('fruit_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} }
function sliceFruit(f, sx, sy){
 if(f.sliced) return;
 f.sliced=true; f.life=0;
 if(f.type.bomb){ lives--; shake=12; SFX.bomb(); burst(f.x,f.y,20,'#ff5a5a'); lvEl.textContent='❤️'.repeat(lives)+'🖤'.repeat(3-lives); if(lives<=0) die(); return; }
 score+=10+combo*2; combo++; comboT=45; if(combo>=3){ score+=combo*5; if(combo%3===0) SFX.combo(); }
 scEl.textContent=score;
 // halves
 halves.push({x:f.x-8,y:f.y,vx:-2+ (Math.random()-0.5)*2,vy:-2,vr:-0.15,rot:f.rot,r:f.r*0.7,type:f.type,life:1});
 halves.push({x:f.x+8,y:f.y,vx:2+ (Math.random()-0.5)*2,vy:-2,vr:0.15,rot:f.rot,r:f.r*0.7,type:f.type,life:1});
 splashes.push({x:f.x,y:f.y,r:5,life:1,c:f.type.c});
 burst(f.x,f.y,10,f.type.c); SFX.slice();
}
function burst(px,py,n,c){ for(let i=0;i<n;i++) splashes.push({x:px+(Math.random()-0.5)*20,y:py+(Math.random()-0.5)*20,r:1+Math.random()*3,life:1,c:c}); }
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle='#0a0a14'; x.fillRect(0,0,W,H);
 // dojo wood
 x.fillStyle='#1a1a2a'; x.fillRect(0,H-80,W,80);
 x.fillStyle='#2a2a3a'; for(let i=0;i<W;i+=28){ x.fillRect(i,H-80,12,80); }
 // fruits
 fruits.forEach(f=>{
  x.save(); x.translate(f.x,f.y); x.rotate(f.rot);
  if(f.type.bomb){
   x.fillStyle='#222'; x.shadowColor='#ff5a5a'; x.shadowBlur=12; x.beginPath(); x.arc(0,0,f.r,0,7); x.fill(); x.shadowBlur=0;
   x.fillStyle='#ff5a5a'; x.fillRect(-2,-f.r-6,4,8); x.fillStyle='#ffd75e'; x.beginPath(); x.arc(0,-f.r-8,3,0,7); x.fill();
  }else{
   x.fillStyle=f.type.c; x.shadowColor=f.type.c; x.shadowBlur=10; x.beginPath(); x.arc(0,0,f.r,0,7); x.fill(); x.shadowBlur=0;
   x.fillStyle='rgba(255,255,255,0.25)'; x.beginPath(); x.arc(-f.r*0.25,-f.r*0.25,f.r*0.25,0,7); x.fill();
  }
  x.restore();
 });
 halves.forEach(h=>{
  x.save(); x.translate(h.x,h.y); x.rotate(h.rot); x.globalAlpha=h.life;
  x.fillStyle=h.type.c; x.beginPath(); x.arc(0,0,h.r,0,6.28); x.fill(); x.fillStyle=h.type.j; x.beginPath(); x.arc(0,0,h.r*0.6,0,6.28); x.fill();
  x.restore();
 });
 splashes.forEach(s=>{ x.globalAlpha=s.life*0.6; x.fillStyle=s.c; x.beginPath(); x.arc(s.x,s.y,s.r,0,7); x.fill();}); x.globalAlpha=1;
 // slash trail
 if(slash.length>1){
  x.lineCap='round'; x.lineJoin='round';
  for(let i=1;i<slash.length;i++){
   let a=slash[i-1], b=slash[i];
   x.globalAlpha= b.life; x.strokeStyle='#fff'; x.lineWidth=6* b.life; x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.stroke();
   x.strokeStyle='#ff7ad7'; x.lineWidth=3* b.life; x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.stroke();
  } x.globalAlpha=1;
 }
 if(combo>=2){ x.textAlign='center'; x.font='900 '+(14+combo*2)+'px Arial Black'; x.fillStyle='#ffd75e'; x.fillText(combo+' COMBO!'+'🔥'.repeat(Math.min(3,Math.floor(combo/2))),W/2,80); x.textAlign='left'; }
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.6)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#ff9ad7'); g.addColorStop(1,'#ff7ad7'); x.fillStyle=g; x.font='900 30px Arial Black'; x.fillText('FRUIT NINJA',W/2,H/2-36);
  x.font='700 10px Arial'; x.fillStyle='#b88ab8'; x.fillText('SWIPE TO SLICE • AVOID BOMBS • COMBO',W/2,H/2-10);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST,W/2,H/2+10);}
  x.font='900 13px Arial'; x.fillStyle='rgba(255,122,215,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('SWIPE TO START',W/2,H/2+38); x.textAlign='left';
  state='play';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.7)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(30,10,30,0.92)'; x.strokeStyle='rgba(255,122,215,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-64,332,128,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle='#ff6a6a'; x.fillText('SLICED!',W/2,H/2-30); x.font='700 12px Arial'; x.fillStyle='#fff'; x.fillText('SCORE '+score+' • BEST '+BEST,W/2,H/2-6);
  if(score>=BEST && score>0){x.fillStyle='#ffd75e'; x.font='900 13px Arial'; x.fillText('★ NEW BEST ★',W/2,H/2+16);} else {x.fillStyle='#b88ab8'; x.fillText('BEST: '+BEST,W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(255,255,255,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to slice again',W/2,H/2+38); x.textAlign='left';
 }
}
let slicing=false, lastX=0, lastY=0;
function checkSlice(x1,y1,x2,y2){
 fruits.forEach(f=>{
  if(f.sliced) return;
  // line-circle intersect
  let dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
  if(len<4) return;
  let t= ((f.x-x1)*dx + (f.y-y1)*dy)/(len*len);
  t=Math.max(0,Math.min(1,t));
  let cx= x1+ t*dx, cy= y1+ t*dy;
  if(Math.hypot(f.x-cx, f.y-cy) < f.r+8){ sliceFruit(f,cx,cy); }
 });
}
cv.addEventListener('pointerdown',e=>{
 ac();
 if(state==='dead'&&performance.now()-overT>600){ reset(); state='play'; return; }
 if(state==='ready'){ state='play'; reset(); return; }
 slicing=true;
 let r=cv.getBoundingClientRect(); lastX=(e.clientX-r.left)/r.width*W; lastY=(e.clientY-r.top)/r.height*H;
 slash.push({x:lastX,y:lastY,life:1});
});
cv.addEventListener('pointermove',e=>{
 if(!slicing) return;
 let r=cv.getBoundingClientRect(); let nx=(e.clientX-r.left)/r.width*W, ny=(e.clientY-r.top)/r.height*H;
 checkSlice(lastX,lastY,nx,ny);
 slash.push({x:nx,y:ny,life:1});
 lastX=nx; lastY=ny;
});
cv.addEventListener('pointerup',()=>{ slicing=false; });
document.getElementById('modeB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); reset(); state='play';});
document.getElementById('bombB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); bombMode=!bombMode; document.getElementById('bombTxt').textContent=bombMode?'ON':'OFF';});
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('fruit_mute',MUTED?'1':'0')}catch(e2){}});
function loop(){ update(); draw(); requestAnimationFrame(loop); }
reset(); requestAnimationFrame(loop);
})();
</script>`;

    const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
    const msg = await generateWAMessageFromContent(from, {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                __typename: "GenAIUnifiedResponse",
                response_id: crypto.randomUUID(),
                sections: [{
                  __typename: "GenAIUnifiedResponseSection",
                  view_model: {
                    __typename: "GenAISingleLayoutViewModel",
                    primitive: {
                      __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                      trusted_sources: [],
                      payload: html
                    }
                  }
                }]
              })).toString("base64")
            },
            contextInfo: { isForwarded: true, forwardOrigin: 4 }
          }
        }
      }
    }, {});
    await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
  }catch(e){ console.error(e); reply('❌ '+e.message); }
});