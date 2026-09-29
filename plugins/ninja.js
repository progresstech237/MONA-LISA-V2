const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "ninja",
  alias: ["ninjajump","walljump","shinobi"],
  react: "🥷",
  desc: "Ninja Wall Jump - Katana Dash",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.ninjaLimit=global.ninjaLimit||{}; const now=Date.now();
if(global.ninjaLimit[from]&&now-global.ninjaLimit[from]<12000) return reply(`⏳ ${Math.ceil((12000-(now-global.ninjaLimit[from]))/1000)}s cooldown`);
global.ninjaLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#1a103a,#050510 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#ff6aff;text-shadow:0 0 12px #ff6aff88;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#8a7ab8}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(255,106,255,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#8a7ab8}
.hr b{font:900 12px 'Arial Black';color:#ff8aff}
.mbtn{width:30px;height:30px;border:1px solid rgba(255,106,255,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(255,106,255,.35);border-radius:14px;overflow:hidden;background:#000;box-shadow:0 0 22px rgba(255,106,255,.18);aspect-ratio:404/620}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:6px;margin-top:6px}
.pd{height:52px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 12px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#leftB{background:linear-gradient(#3a2a5a,#1a102a)}#rightB{background:linear-gradient(#3a2a5a,#1a102a)}
#jumpB{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
#dashB{grid-column:span 3;height:42px;background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805}
.hint{text-align:center;font:600 8px Arial;color:#8a7ab8;margin-top:4px}
</style>
<div id="app">
<div class="hdr"><div class="tt">🥷 NINJA JUMP<small>WALL RUN EDITION</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>HEIGHT</i><b id="ht">0m</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="404" height="620"></canvas></div>
<div class="pads"><button class="pd" id="leftB">◀</button><button class="pd" id="jumpB">⤒ JUMP</button><button class="pd" id="rightB">▶</button><button class="pd" id="dashB">⚡ KATANA DASH (30% CHI)</button></div>
<div class="hint">TAP side to cling • JUMP to wall-jump • Double-tap for shuriken • DASH cuts enemies</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), W=404, H=620, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), htEl=document.getElementById('ht');
let BEST=0; try{BEST=parseInt(localStorage.getItem('ninja_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('ninja_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v,at,sl){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.setValueAtTime(f,n); if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d); g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.03);}catch(e){}}
function noiz(d,v,at,fc){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(); s.buffer=b; f.type='lowpass'; f.frequency.value=fc||1200; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.03);}catch(e){}}
const SFX={ jump:()=>{tone(300,.08,'sine',.12,0,800);}, wall:()=>{tone(500,.06,'square',.1); noiz(.06,.1,0,2000);}, dash:()=>{noiz(.25,.22,0,2500); tone(200,.35,'sawtooth',.18,0,900);}, slash:()=>{tone(800,.08,'square',.15,0,200); noiz(.1,.15,0,4000);}, die:()=>{ [600,400,200,100].forEach((f,i)=>tone(f,.18,'sawtooth',.14,i*.09,f*.5)); noiz(.4,.2,0.3,600);} };
let state='ready', score=0, height=0, maxH=0, chi=40, frame=0, shake=0, overT=0, camY=0;
let player, walls=[], enemies=[], shurikens=[], parts=[], spikes=[];
function reset(){
 score=0; height=0; maxH=0; chi=40; walls=[]; enemies=[]; shurikens=[]; parts=[]; spikes=[]; frame=0; shake=0; camY=0;
 player={x:W/2,y:H-80,w:18,h:22,vx:0,vy:0,wall:false,wallSide:0,jumps:1,dir:1,dash:0};
 for(let i=0;i<14;i++) walls.push({x:i%2===0?0:W-18,y:H-i*90-40,h:70+Math.random()*60,side:i%2});
 scEl.textContent='0'; htEl.textContent='0m';
}
reset();
function burst(px,py,n,c){ for(let i=0;i<n;i++) parts.push({x:px,y:py,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7-1,life:1,c:c||'#ff6aff',s:1+Math.random()*2.5}); }
let nextWall=H-200;
function spawn(){
 if(camY < nextWall+400){
  let side=Math.random()<0.5?0:1;
  let y=nextWall-80-Math.random()*40;
  walls.push({x:side===0?0:W-18,y:y,h:60+Math.random()*90,side:side});
  if(Math.random()<0.55) enemies.push({x:side===0?28:W-28,y:y-20,hp:1,vy:0.3});
  if(Math.random()<0.18) spikes.push({x:Math.random()*(W-60)+30,y:y-50});
  nextWall=y;
 }
}
function update(){
 frame++; if(shake>0)shake*=0.86;
 if(player.dash>0) player.dash--;
 if(player.wall) chi=Math.min(100,chi+0.15);
 if(state!=='play') return;
 spawn();
 // gravity
 player.vy+=0.52; if(player.wall) player.vy=Math.min(player.vy,1.2);
 player.x+=player.vx; player.y+=player.vy; player.vx*=0.88;
 // walls collision
 player.wall=false;
 walls.forEach(w=>{
  let wy=w.y-camY;
  if(player.y+10>wy && player.y-10<wy+w.h){
   if(w.side===0 && player.x<22){ player.x=22; if(player.vx<0){ player.wall=true; player.wallSide=-1; player.vx=0; player.vy=Math.min(player.vy,0.8); } }
   if(w.side===1 && player.x>W-22){ player.x=W-22; if(player.vx>0){ player.wall=true; player.wallSide=1; player.vx=0; player.vy=Math.min(player.vy,0.8); } }
  }
 });
 if(player.wall) player.jumps=1;
 // camera follow up
 if(player.y-camY < H*0.35){ camY -= (H*0.35 - (player.y-camY))*0.12; }
 height=Math.max(maxH, Math.floor((0-camY)/10)); if(height>maxH){ maxH=height; score+=1; }
 // fall death
 if(player.y-camY > H+40) die();
 // shurikens
 for(let i=shurikens.length-1;i>=0;i--){ let s=shurikens[i]; s.x+=s.vx; s.y+=s.vy; s.rot+=0.3; s.life--; if(s.life<=0||s.y-camY<-20||s.y-camY>H+20||s.x<-20||s.x>W+20) shurikens.splice(i,1); }
 // enemies
 for(let i=enemies.length-1;i>=0;i--){ let en=enemies[i]; en.y+=en.vy;
  for(let j=shurikens.length-1;j>=0;j--){ let sh=shurikens[j]; if(Math.hypot(sh.x-en.x, sh.y-(en.y-camY))<18){ enemies.splice(i,1); shurikens.splice(j,1); burst(en.x,en.y-camY,12,'#ff5a5a'); score+=30; chi=Math.min(100,chi+8); SFX.slash(); break; } }
  if(i<enemies.length && Math.hypot(player.x-en.x, player.y-(en.y))<22){
   if(player.dash>0){ enemies.splice(i,1); burst(en.x,en.y-camY,14,'#ffd75e'); score+=50; }
   else die();
  }
 }
 // spikes
 spikes.forEach(sp=>{ if(Math.hypot(player.x-sp.x, player.y-(sp.y-camY))<20 && player.dash===0) die(); });
 // dash kill
 if(player.dash>0){ enemies.forEach((en,idx)=>{ if(Math.hypot(player.x-en.x, player.y-(en.y))<40){ burst(en.x,en.y-camY,12,'#ffd75e'); } }); }
 for(let i=parts.length-1;i>=0;i--){ let p=parts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; if((p.life-=0.04)<=0) parts.splice(i,1); }
 scEl.textContent=score; htEl.textContent=maxH+'m';
 // cleanup walls
 walls=walls.filter(w=> w.y-camY < H+100);
 spikes=spikes.filter(s=> s.y-camY < H+100);
}
function die(){ if(state!=='dead'){ state='dead'; overT=performance.now(); shake=16; SFX.die(); burst(player.x,player.y-camY,26,'#ff6aff'); if(score>BEST){BEST=score; try{localStorage.setItem('ninja_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} } }
function jump(dir){
 ac();
 if(state==='ready'){ state='play'; reset(); return; }
 if(state==='dead'&&performance.now()-overT>600){ state='play'; reset(); return; }
 if(player.wall){
  player.vy=-10.5; player.vx= dir!==0? dir*6.2 : -player.wallSide*6.5;
  player.wall=false; player.dir= player.vx>0?1:-1; SFX.wall(); burst(player.x,player.y-camY,6,'#fff');
 }else if(player.jumps>0){
  player.vy=-9.2; player.jumps--; SFX.jump();
 }
}
function throwShuriken(){
 if(state!=='play') return;
 ac(); SFX.slash();
 shurikens.push({x:player.x+player.dir*10,y:player.y-camY,vx:player.dir*8,vy:-0.5,rot:0,life:90});
 chi=Math.max(0,chi-4);
}
function katanaDash(){
 ac(); if(chi<30||state!=='play') return; chi-=30; player.dash=18; player.vx=player.dir*10; player.vy=-2; SFX.dash(); shake=8; burst(player.x,player.y-camY,10,'#ffd75e');
}
// INPUT
document.getElementById('leftB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); player.dir=-1; if(player.wall&&player.wallSide===1) jump(-1); else { player.vx=-5; if(!player.wall) jump(-1); }});
document.getElementById('rightB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); player.dir=1; if(player.wall&&player.wallSide===-1) jump(1); else { player.vx=5; if(!player.wall) jump(1); }});
document.getElementById('jumpB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); if(frame%2===0 && player.wall){ throwShuriken(); } jump(0);});
document.getElementById('dashB').addEventListener('pointerdown',e=>{e.preventDefault(); katanaDash();});
cv.addEventListener('pointerdown',e=>{
 ac(); if(state!=='ready'&&state!=='dead'){
  let r=cv.getBoundingClientRect(); let tx=(e.clientX-r.left)/r.width*W;
  if(tx<W*0.33){ player.dir=-1; player.vx=-5.5; jump(-1); } else if(tx>W*0.66){ player.dir=1; player.vx=5.5; jump(1); } else { if(e.detail===2||frame%3===0) throwShuriken(); else jump(0); }
 } else { jump(0); }
});
document.addEventListener('keydown',e=>{ if(e.code==='Space'){e.preventDefault(); jump(0);} if(e.code==='KeyX') throwShuriken(); if(e.code==='KeyZ') katanaDash(); if(e.code==='ArrowLeft'){player.dir=-1; player.vx=-5;} if(e.code==='ArrowRight'){player.dir=1; player.vx=5;} });
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('ninja_mute',MUTED?'1':'0')}catch(e2){}});
// DRAW
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle='#050510'; x.fillRect(0,0,W,H);
 // bg mountains
 x.fillStyle='#12082a'; x.beginPath(); x.moveTo(0,H); for(let i=0;i<=W;i+=20){ x.lineTo(i, H*0.7+ Math.sin(i*0.01+camY*0.002)*18 + Math.sin(i*0.02)*10); } x.lineTo(W,H); x.fill();
 // walls
 walls.forEach(w=>{
  let wy=w.y-camY;
  if(wy<-80||wy>H+80) return;
  let grad=x.createLinearGradient(w.x,0,w.x+18,0); grad.addColorStop(0,'#2a1a4a'); grad.addColorStop(1,'#1a102a');
  x.fillStyle=grad; x.fillRect(w.x,wy,18,w.h);
  x.fillStyle='rgba(255,106,255,0.12)'; x.fillRect(w.x,wy,18,w.h);
  // bricks
  x.strokeStyle='rgba(255,255,255,0.06)'; x.lineWidth=1; for(let by=wy;by<wy+w.h;by+=14){ x.beginPath(); x.moveTo(w.x,by); x.lineTo(w.x+18,by); x.stroke(); }
  if(player.wall && ((w.side===0&&player.x<24)||(w.side===1&&player.x>W-24))){ x.fillStyle='rgba(255,255,255,0.18)'; x.fillRect(w.x,wy,18,w.h); }
 });
 // spikes
 spikes.forEach(sp=>{
  let sy=sp.y-camY; x.fillStyle='#ff3b5a'; x.beginPath(); x.moveTo(sp.x-8,sy+6); x.lineTo(sp.x+8,sy+6); x.lineTo(sp.x,sy-10); x.closePath(); x.fill();
 });
 // enemies
 enemies.forEach(en=>{
  let ey=en.y-camY; x.save(); x.translate(en.x,ey);
  x.fillStyle='#ff3b5a'; x.beginPath(); x.arc(0,0,9,0,7); x.fill(); x.fillStyle='#111'; x.fillRect(-5,-1,10,3); x.fillStyle='#ffd75e'; x.beginPath(); x.arc(0,-2,2,0,7); x.fill();
  x.restore();
 });
 // shurikens
 shurikens.forEach(s=>{
  x.save(); x.translate(s.x,s.y); x.rotate(s.rot);
  x.fillStyle='#c0c6d0'; x.beginPath(); for(let i=0;i<4;i++){ x.rotate(1.57); x.fillRect(-2,-10,4,20);} x.fill(); x.fillStyle='#111'; x.beginPath(); x.arc(0,0,3,0,7); x.fill(); x.restore();
 });
 // player
 if(state!=='play' || frame%12<10 || player.dash>0){
  x.save(); x.translate(player.x,player.y-camY);
  if(player.dash>0){ x.globalAlpha=0.5; x.fillStyle='#ffd75e'; x.fillRect(-18,-12,36,24); x.globalAlpha=1; }
  x.scale(player.dir,1);
  // ninja
  x.fillStyle='#111'; x.fillRect(-7,-10,14,18);
  x.fillStyle='#ff6aff'; x.fillRect(-9,8,7,10); x.fillRect(2,8,7,10);
  x.fillStyle='#f2c9a0'; x.beginPath(); x.arc(0,-14,7,0,7); x.fill();
  x.fillStyle='#111'; x.fillRect(-7,-18,14,4);
  x.fillStyle='#ff6aff'; x.beginPath(); x.moveTo(6,-16); x.lineTo(12,-14); x.lineTo(6,-10); x.closePath(); x.fill();
  if(player.wall){ x.strokeStyle='#fff'; x.lineWidth=1.5; x.beginPath(); x.moveTo(player.wallSide===-1?-10:10,0); x.lineTo(player.wallSide===-1?-14:14,4); x.stroke(); }
  x.restore();
 }
 parts.forEach(p=>{ x.globalAlpha=Math.max(0,p.life); x.fillStyle=p.c; x.fillRect(p.x,p.y-camY,p.s,p.s);}); x.globalAlpha=1;
 // chi bar
 x.fillStyle='rgba(0,0,0,0.5)'; x.fillRect(8,H-18,W-16,10); x.fillStyle=chi>30?'#ff6aff':'#ff3b5a'; x.fillRect(8,H-18,(W-16)*chi/100,10);
 x.font='700 8px Arial'; x.fillStyle='#fff'; x.fillText('CHI '+Math.floor(chi)+'% SHURIKEN',12,H-10);
 // ready / dead
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.55)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#ffb0ff'); g.addColorStop(1,'#ff6aff'); x.fillStyle=g; x.font='900 28px Arial Black'; x.fillText('NINJA JUMP',W/2,H/2-32);
  x.font='700 10px Arial'; x.fillStyle='#b8a0d8'; x.fillText('WALL CLING • DOUBLE JUMP • DASH',W/2,H/2-8);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST+'m',W/2,H/2+12);}
  x.font='900 13px Arial'; x.fillStyle='rgba(255,255,255,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO CLIMB',W/2,H/2+38); x.textAlign='left';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.62)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(30,10,40,0.92)'; x.strokeStyle='rgba(255,106,255,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-64,332,128,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle='#ff6a6a'; x.fillText('FALLEN',W/2,H/2-30); x.font='700 12px Arial'; x.fillStyle='#fff'; x.fillText('HEIGHT '+maxH+'m • SCORE '+score,W/2,H/2-6);
  if(score>=BEST && score>0){x.fillStyle='#ffd75e'; x.font='900 13px Arial'; x.fillText('★ NEW BEST ★',W/2,H/2+16);} else {x.fillStyle='#b8a0d8'; x.fillText('BEST: '+BEST+'m',W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(255,255,255,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to climb again',W/2,H/2+38); x.textAlign='left';
 }
}
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