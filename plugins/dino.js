const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "dino",
  alias: ["dinogame","chromedino","dinochrome","trex"],
  react: "🦖",
  desc: "Chrome Dino - Ultra Runner",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.dinoLimit=global.dinoLimit||{}; const now=Date.now();
if(global.dinoLimit[from]&&now-global.dinoLimit[from]<10000) return reply(`⏳ ${Math.ceil((10000-(now-global.dinoLimit[from]))/1000)}s cooldown`);
global.dinoLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#2a2a3a,#0a0a0e 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#a8ff60;text-shadow:0 0 12px #a8ff6088;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#8a9ab8}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(168,255,96,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#8a9ab8}
.hr b{font:900 12px 'Arial Black';color:#a8ff60}
.mbtn{width:30px;height:30px;border:1px solid rgba(168,255,96,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(168,255,96,.35);border-radius:14px;overflow:hidden;background:#f7f7f7;box-shadow:0 0 22px rgba(168,255,96,.18);aspect-ratio:404/320}
.gw.night{background:#0f0f1a}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.pd{height:52px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 12px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#jumpB{background:linear-gradient(#a8ff60,#5ab00a 60%,#2a5a05)}
#duckB{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
#dashB{grid-column:span 2;height:40px;background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805}
.hint{text-align:center;font:600 8px Arial;color:#8a9ab8;margin-top:4px}
</style>
<div id="app">
<div class="hdr"><div class="tt">🦖 DINO RUN<small>CHROME ULTRA</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>SPEED</i><b id="sp">6.0</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw" id="gw"><canvas id="cv" width="404" height="320"></canvas></div>
<div class="pads"><button class="pd" id="jumpB">⤒ JUMP</button><button class="pd" id="duckB">⤓ DUCK</button><button class="pd" id="dashB">⚡ DASH (40% ENERGY)</button></div>
<div class="hint">Tap to jump • Hold DUCK under pteros • DASH breaks cactus • Night mode after 500</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), gw=document.getElementById('gw'), W=404, H=320, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), spEl=document.getElementById('sp');
let BEST=0; try{BEST=parseInt(localStorage.getItem('dino_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('dino_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v,at,sl){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.setValueAtTime(f,n); if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d); g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.03);}catch(e){}}
function noiz(d,v,at,fc){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(); s.buffer=b; f.type='lowpass'; f.frequency.value=fc||1200; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.03);}catch(e){}}
const SFX={ jump:()=>{tone(300,.1,'sine',.12,0,800);}, duck:()=>{tone(200,.08,'sine',.08);}, dash:()=>{noiz(.2,.2,0,2000); tone(150,.3,'sawtooth',.15,0,600);}, hit:()=>{noiz(.25,.25,0,600); tone(120,.2,'sawtooth',.18);}, mile:()=>{[659,784,1047,1319].forEach((f,i)=>tone(f,.08,'square',.1,i*.06));} };
let state='ready', score=0, speed=6, baseSpeed=6, energy=40, frame=0, shake=0, overT=0, night=false, groundX=0;
let player, cacti=[], birds=[], clouds=[], parts=[];
function reset(){
 score=0; speed=baseSpeed; energy=40; cacti=[]; birds=[]; parts=[]; clouds=[]; frame=0; shake=0; groundX=0; night=false; gw.classList.remove('night');
 player={x:42,y:0,w:24,h:22,vy:0,grounded:true,duck:false,dash:0,leg:0};
 for(let i=0;i<5;i++) clouds.push({x:Math.random()*W,y:12+Math.random()*50,s:0.2+Math.random()*0.6,w:30+Math.random()*30});
 scEl.textContent='0'; spEl.textContent=speed.toFixed(1);
}
reset();
function burst(px,py,n,c){ for(let i=0;i<n;i++) parts.push({x:px,y:py,vx:(Math.random()-.5)*5,vy:-Math.random()*4,life:1,c:c||'#a8ff60',s:1.5+Math.random()*2}); }
let nextCactus=0, nextBird=300;
function spawn(){
 if(frame>nextCactus){
  let type=Math.random();
  if(type<0.5) cacti.push({x:W+20,w:16,h:24+Math.random()*16});
  else if(type<0.8) cacti.push({x:W+20,w:28,h:22});
  else cacti.push({x:W+20,w:36,h:30, double:true});
  nextCactus=frame+ 70+Math.random()*70 - speed*3;
 }
 if(frame>nextBird && score>150){
  if(Math.random()<0.5) birds.push({x:W+30,y:30+Math.random()*60,w:24,h:12,wing:0,vy:Math.sin(frame*0.05)*0.3});
  nextBird=frame+ 180+Math.random()*200;
 }
}
function update(){
 frame++; groundX+=speed; if(player.dash>0) player.dash--; if(player.leg% (speed>8?4:6)===0) player.leg^=1;
 if(state!=='play') return;
 spawn();
 // player physics
 if(!player.grounded){ player.vy+=0.62; player.y+=player.vy; if(player.y>=0){ player.y=0; player.vy=0; player.grounded=true; } }
 // cacti move
 cacti.forEach(c=>{ c.x-=speed; });
 cacti=cacti.filter(c=>c.x>-40);
 birds.forEach(b=>{ b.x-=speed*1.15; b.y+=Math.sin(frame*0.08+b.x*0.01)*0.4; b.wing+=0.22; });
 birds=birds.filter(b=>b.x>-40);
 clouds.forEach(c=>{ c.x-=c.s; if(c.x<-50){ c.x=W+20; c.y=12+Math.random()*50; } });
 // collisions
 let px=player.x, py= 210 + player.y - (player.duck?10:0);
 let pw=player.w, ph=player.duck?14:player.h;
 for(let c of cacti){
  let cx=c.x, cy=210 - c.h;
  if(px+pw-6>cx+4 && px+6<cx+c.w-4 && py+ph>cy+4 && py<cy+c.h){
   if(player.dash>0){ burst(cx+c.w/2,cy+c.h/2,14,'#ffd75e'); cacti.splice(cacti.indexOf(c),1); score+=30; energy=Math.min(100,energy+12); }
   else die();
  }
 }
 for(let b of birds){
  let bx=b.x, by=b.y+40;
  if(px+pw-4>bx+2 && px+4<bx+b.w-2 && py+ph>by+2 && py<by+b.h){
   if(player.duck || player.dash>0){ if(player.dash>0){ burst(bx,by,10,'#7df'); birds.splice(birds.indexOf(b),1); score+=40; } }
   else die();
  }
 }
 score+=speed*0.18; energy=Math.min(100,energy+0.06);
 if(Math.floor(score)%100===0 && Math.floor(score)>0 && frame%20===0){ SFX.mile(); speed=Math.min(13.5,speed+0.18); spEl.textContent=speed.toFixed(1); if(score>500 &&!night){ night=true; gw.classList.add('night'); } }
 scEl.textContent=Math.floor(score);
 for(let i=parts.length-1;i>=0;i--){ let p=parts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; if((p.life-=0.03)<=0) parts.splice(i,1); }
}
function die(){ state='dead'; overT=performance.now(); shake=12; SFX.hit(); burst(player.x,210,22,'#a8ff60'); if(Math.floor(score)>BEST){BEST=Math.floor(score); try{localStorage.setItem('dino_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} }
function jump(){
 ac();
 if(state==='ready'){ state='play'; reset(); return; }
 if(state==='dead'&&performance.now()-overT>600){ state='play'; reset(); return; }
 if(player.grounded &&!player.duck){ player.vy=-9.8; player.grounded=false; SFX.jump(); }
}
function duckDown(){ if(state==='play'&&player.grounded){ player.duck=true; SFX.duck(); } }
function duckUp(){ player.duck=false; }
function dash(){
 ac(); if(energy<40||state!=='play') return; energy-=40; player.dash=22; SFX.dash(); shake=6; burst(player.x,210,10,'#ffd75e');
}
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle= night?'#0f0f1a':'#f7f7f7'; x.fillRect(0,0,W,H);
 // clouds
 x.fillStyle= night?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.12)';
 clouds.forEach(c=>{ x.fillRect(c.x,c.y,c.w,6); x.fillRect(c.x+6,c.y-4,c.w*0.5,4); });
 // ground
 x.strokeStyle= night?'#2a2a3a':'#535353'; x.lineWidth=1.2; x.beginPath(); x.moveTo(0,210); x.lineTo(W,210); x.stroke();
 x.fillStyle= night?'#1e1e2a':'#535353';
 for(let i=0;i<W+20;i+=20){ let gx=(i - groundX%20); x.fillRect(gx,212, Math.random()<0.3?4:2,2); }
 // cacti
 cacti.forEach(c=>{
  let y=210-c.h; x.fillStyle= night?'#3a5a2a':'#2a5a0a';
  x.fillRect(c.x,y,c.w,c.h);
  x.fillStyle= night?'#5a8a3a':'#3a7a1a'; x.fillRect(c.x+2,y+2,c.w-4,c.h-6);
  if(c.double){ x.fillRect(c.x-6,y+10,6,8); x.fillRect(c.x+c.w,y+10,6,8); }
  // spikes
  x.fillStyle='#1a3a0a'; x.fillRect(c.x+4,y,2,6); x.fillRect(c.x+c.w-6,y,2,6);
 });
 // birds
 birds.forEach(b=>{
  x.save(); x.translate(b.x+b.w/2,b.y+46);
  let wing=Math.sin(b.wing)*0.6;
  x.fillStyle='#ff5a5a'; x.beginPath(); x.moveTo(-b.w/2,0); x.lineTo(b.w/2,0); x.lineTo(0,6); x.closePath(); x.fill();
  x.fillStyle='#111'; x.save(); x.rotate(wing); x.fillRect(-b.w/2,-1,b.w/2,2); x.restore(); x.save(); x.rotate(-wing); x.fillRect(0,-1,b.w/2,2); x.restore();
  x.fillStyle='#ffd75e'; x.beginPath(); x.arc(b.w/2-2,0,2,0,7); x.fill();
  x.restore();
 });
 // dino
 x.save(); x.translate(player.x, 210 + player.y - (player.duck?10:0));
 if(player.dash>0){ x.shadowColor='#ffd75e'; x.shadowBlur=14; }
 // shadow
 x.fillStyle='rgba(0,0,0,0.18)'; x.beginPath(); x.ellipse(6, player.duck?14:22, 14,3,0,0,7); x.fill();
 // body
 x.fillStyle= night?'#c8ff8a':'#535353';
 if(player.duck){
  x.fillRect(0,-6,32,10); x.fillRect(28,-2,10,4);
  x.fillRect(4,4,8,8); x.fillRect(18,4,8,8);
 }else{
  let leg=player.leg;
  x.fillRect(0,-18,24,16); x.fillRect(22,-12,10,5);
  x.fillRect(2,0,6, leg?12:8); x.fillRect(14,0,6, leg?8:12);
  // eye
  x.fillStyle='#fff'; x.fillRect(18,-14,4,4); x.fillStyle='#111'; x.fillRect(20,-12,2,2);
  // arm
  x.fillStyle= night?'#c8ff8a':'#535353'; x.fillRect(6,-6,8,3);
 }
 x.shadowBlur=0; x.restore();
 parts.forEach(p=>{ x.globalAlpha=Math.max(0,p.life); x.fillStyle=p.c; x.fillRect(p.x,p.y,p.s,p.s);}); x.globalAlpha=1;
 if(state==='ready'){
  x.fillStyle= night?'rgba(0,0,0,0.6)':'rgba(255,255,255,0.75)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#d0ff9a'); g.addColorStop(1,'#5ab00a'); x.fillStyle=g; x.font='900 30px Arial Black'; x.fillText('DINO RUN',W/2,H/2-34);
  x.font='700 10px Arial'; x.fillStyle= night?'#8ab8e8':'#535353'; x.fillText('JUMP • DUCK • DASH THROUGH CACTUS',W/2,H/2-10);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST,W/2,H/2+10);}
  x.font='900 13px Arial'; x.fillStyle= night?'rgba(255,255,255,0.7)':'rgba(0,0,0,0.6)'; x.fillStyle='rgba(168,255,96,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO RUN',W/2,H/2+38); x.textAlign='left';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.62)'; x.fillRect(0,0,W,H); x.fillStyle= night?'rgba(20,30,20,0.92)':'rgba(255,255,255,0.95)'; x.strokeStyle='rgba(168,255,96,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-64,332,128,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle='#ff5a5a'; x.fillText('GAME OVER',W/2,H/2-30); x.font='700 12px Arial'; x.fillStyle= night?'#fff':'#111'; x.fillText('SCORE '+Math.floor(score)+' • SPEED '+speed.toFixed(1),W/2,H/2-6);
  if(Math.floor(score)>=BEST && score>0){x.fillStyle='#ffd75e'; x.font='900 13px Arial'; x.fillText('★ NEW BEST ★',W/2,H/2+16);} else {x.fillStyle='#8a9ab8'; x.fillText('BEST: '+BEST,W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(0,0,0,0.6)'; if(night) x.fillStyle='rgba(255,255,255,0.6)'; x.fillStyle='rgba(168,255,96,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to retry',W/2,H/2+38); x.textAlign='left';
 }
}
document.getElementById('jumpB').addEventListener('pointerdown',e=>{e.preventDefault(); jump();});
document.getElementById('duckB').addEventListener('pointerdown',e=>{e.preventDefault(); duckDown();});
document.getElementById('duckB').addEventListener('pointerup',duckUp);
document.getElementById('duckB').addEventListener('pointerleave',duckUp);
document.getElementById('dashB').addEventListener('pointerdown',e=>{e.preventDefault(); dash();});
cv.addEventListener('pointerdown',e=>{
 ac(); if(state!=='ready'&&state!=='dead'){
  let r=cv.getBoundingClientRect(); let ty=(e.clientY-r.top)/r.height*H;
  if(ty>H*0.6) duckDown(); else jump();
 } else jump();
});
cv.addEventListener('pointerup',duckUp);
document.addEventListener('keydown',e=>{ if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault(); jump();} if(e.code==='ArrowDown') duckDown(); if(e.code==='KeyX') dash(); });
document.addEventListener('keyup',e=>{ if(e.code==='ArrowDown') duckUp(); });
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('dino_mute',MUTED?'1':'0')}catch(e2){}});
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