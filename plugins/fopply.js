const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "flappy",
  alias: ["flappybird","bird","floppybird","floppy"],
  react: "🐦",
  desc: "Flappy Bird Ultra",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.flappyLimit=global.flappyLimit||{}; const now=Date.now();
if(global.flappyLimit[from]&&now-global.flappyLimit[from]<8000) return reply(`⏳ ${Math.ceil((8000-(now-global.flappyLimit[from]))/1000)}s cooldown`);
global.flappyLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#7ad7ff,#1a3a5a 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#ffd75e;text-shadow:0 0 12px #ffd75e88;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#8ab8e8}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.45);border:1px solid rgba(255,215,94,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#8ab8e8}
.hr b{font:900 12px 'Arial Black';color:#ffd75e}
.mbtn{width:30px;height:30px;border:1px solid rgba(255,215,94,.3);border-radius:8px;background:rgba(0,0,0,.45);color:#fff}
.gw{position:relative;border:2px solid rgba(255,215,94,.35);border-radius:14px;overflow:hidden;background:linear-gradient(#7ad7ff 0%,#bfe8ff 70%);box-shadow:0 0 22px rgba(255,215,94,.18);aspect-ratio:404/620}
.gw.night{background:linear-gradient(#0f1a3a 0%,#1a2a5a 70%)}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.pd{height:52px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 12px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#flapB{background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805;font-size:16px}
#dashB{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
.hint{text-align:center;font:600 8px Arial;color:#6a8ab8;margin-top:4px}
</style>
<div id="app">
<div class="hdr"><div class="tt">🐦 FLAPPY ULTRA<small>PIPE EDITION</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>PIPE</i><b id="pp">0</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw" id="gw"><canvas id="cv" width="404" height="620"></canvas></div>
<div class="pads"><button class="pd" id="flapB">⤒ FLAP!</button><button class="pd" id="dashB">⚡ DASH (35%)</button></div>
<div class="hint">Tap to flap • Hold DASH to break pipe • Night after 15 pipes • Double tap = super flap</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), gw=document.getElementById('gw'), x=cv.getContext('2d'), W=404, H=620, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), ppEl=document.getElementById('pp');
let BEST=0; try{BEST=parseInt(localStorage.getItem('flappy_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('flappy_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v,at,sl){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.setValueAtTime(f,n); if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d); g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.03);}catch(e){}}
function noiz(d,v,at,fc){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(); s.buffer=b; f.type='lowpass'; f.frequency.value=fc||1200; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.03);}catch(e){}}
const SFX={ flap:()=>{tone(400,.08,'sine',.12,0,800);}, score:()=>{tone(600,.08,'square',.12); tone(900,.12,'square',.1,.06);}, hit:()=>{noiz(.22,.22,0,800); tone(180,.2,'sawtooth',.16);}, dash:()=>{noiz(.18,.18,0,2500); tone(200,.25,'sawtooth',.14,0,700);} };
let state='ready', score=0, pipes=0, speed=2.2, energy=45, frame=0, shake=0, overT=0, night=false;
let bird, pipeArr=[], clouds=[], parts=[], groundX=0;
function reset(){
 score=0; pipes=0; speed=2.2; energy=45; pipeArr=[]; parts=[]; clouds=[]; groundX=0; night=false; gw.classList.remove('night');
 bird={x:90,y:H/2,w:26,h:20,vy:0,rot:0,dash:0};
 for(let i=0;i<6;i++) clouds.push({x:Math.random()*W,y:20+Math.random()*180,s:0.4+Math.random()*0.8,w:40+Math.random()*40});
 scEl.textContent='0'; ppEl.textContent='0';
}
reset();
function spawnPipe(){
 let gap= 135 - Math.min(30, pipes*1.2);
 let y= 90+Math.random()*(H-180-gap);
 pipeArr.push({x:W+20,y:y,gap:gap, passed:false, moving: pipes>10 && Math.random()<0.35, dir:Math.random()<0.5?1:-1, dy:0});
}
function burst(px,py,n,c){ for(let i=0;i<n;i++) parts.push({x:px,y:py,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6-1,life:1,c:c||'#ffd75e',s:2+Math.random()*2.5}); }
let nextPipe=0;
function update(){
 frame++; groundX+=speed; if(bird.dash>0) bird.dash--; if(shake>0)shake*=0.88;
 if(state!=='play') return;
 if(frame>nextPipe){ spawnPipe(); nextPipe=frame+ 90 - Math.min(25, speed*4); }
 bird.vy+=0.42; if(bird.dash>0) bird.vy*=0.92; bird.y+=bird.vy; bird.rot= Math.max(-0.6, Math.min(1.2, bird.vy*0.07));
 if(bird.y<0){ bird.y=0; bird.vy=0; }
 if(bird.y>H-70){ die(); return; }
 pipeArr.forEach(p=>{
  p.x-=speed; if(p.moving){ p.dy+=p.dir*0.18; if(Math.abs(p.dy)>18) p.dir*=-1; }
  if(!p.passed && p.x+40<bird.x){ p.passed=true; pipes++; score+=10; energy=Math.min(100,energy+6); speed=Math.min(5.5,speed+0.05); SFX.score(); scEl.textContent=score; ppEl.textContent=pipes; if(pipes===15){ night=true; gw.classList.add('night'); } }
  // collision
  let topY=p.y+p.dy, bottomY=p.y+p.gap+p.dy;
  if(bird.x+bird.w-6>p.x+4 && bird.x+6<p.x+46){
   if(bird.y+4 < topY || bird.y+bird.h-4 > bottomY){
    if(bird.dash>0){ burst(p.x+20, bird.y,10,'#a8ff60'); pipeArr.splice(pipeArr.indexOf(p),1); score+=5; }
    else die();
   }
  }
 });
 pipeArr=pipeArr.filter(p=>p.x>-60);
 clouds.forEach(c=>{ c.x-=c.s; if(c.x<-60){ c.x=W+20; c.y=20+Math.random()*180; } });
 for(let i=parts.length-1;i>=0;i--){ let pt=parts[i]; pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=0.12; if((pt.life-=0.03)<=0) parts.splice(i,1); }
}
function die(){ state='dead'; overT=performance.now(); shake=12; SFX.hit(); burst(bird.x,bird.y,18,'#ffd75e'); if(score>BEST){BEST=score; try{localStorage.setItem('flappy_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} }
function flap(strong){
 ac();
 if(state==='ready'){ state='play'; reset(); }
 if(state==='dead'&&performance.now()-overT>600){ state='play'; reset(); return; }
 if(state!=='play') return;
 bird.vy= strong? -8.5 : -6.2; SFX.flap(); burst(bird.x,bird.y+10,4,'#fff');
}
function dash(){
 ac(); if(energy<35||state!=='play') return; energy-=35; bird.dash=18; bird.vy=-1; SFX.dash(); shake=5; burst(bird.x,bird.y,12,'#58c7ff');
}
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle= night? '#0f1a3a':'#7ad7ff'; x.fillRect(0,0,W,H);
 if(!night){ x.fillStyle='rgba(255,255,255,0.7)'; clouds.forEach(c=>{ x.fillRect(c.x,c.y,c.w,14); x.fillRect(c.x+8,c.y-6,c.w*0.6,8); }); }
 else{ x.fillStyle='rgba(255,255,255,0.15)'; clouds.forEach(c=>{ x.fillRect(c.x,c.y,c.w,10); }); x.fillStyle='#fff'; for(let i=0;i<20;i++){ let cx=(i*37+frame*0.3)%W, cy= (i*19)%120; x.fillRect(cx,cy,2,2);} }
 // pipes
 pipeArr.forEach(p=>{
  let topY=p.y+p.dy, bottomY=p.y+p.gap+p.dy;
  // top
  let grad=x.createLinearGradient(p.x,0,p.x+50,0); grad.addColorStop(0,'#5ab00a'); grad.addColorStop(0.5,'#a8ff60'); grad.addColorStop(1,'#2a6a05');
  x.fillStyle=grad; x.fillRect(p.x,0,50,topY);
  x.fillStyle='#2a6a05'; x.fillRect(p.x-4,topY-18,58,18);
  // bottom
  x.fillStyle=grad; x.fillRect(p.x,bottomY,50,H-bottomY);
  x.fillStyle='#2a6a05'; x.fillRect(p.x-4,bottomY,58,18);
  // bolts
  x.fillStyle='rgba(0,0,0,0.2)'; x.fillRect(p.x+8,topY-14,6,6); x.fillRect(p.x+30,topY-14,6,6);
 });
 // ground
 x.fillStyle= night? '#1a2a1a':'#ded895'; x.fillRect(0,H-44,W,44);
 x.fillStyle= night? '#2a4a2a':'#5ab00a'; x.fillRect(0,H-44,W,8);
 x.fillStyle='rgba(0,0,0,0.1)'; for(let i=0;i<W+20;i+=20){ let gx=i-groundX%20; x.fillRect(gx,H-36,10,4); }
 // bird
 x.save(); x.translate(bird.x+bird.w/2,bird.y+bird.h/2); x.rotate(bird.rot);
 if(bird.dash>0){ x.shadowColor='#58c7ff'; x.shadowBlur=14; }
 x.fillStyle='#ffd75e'; x.beginPath(); x.ellipse(0,0,bird.w/2,bird.h/2,0,0,7); x.fill();
 x.fillStyle='#ff9a3c'; x.beginPath(); x.moveTo(bird.w/2-2,0); x.lineTo(bird.w/2+12,4); x.lineTo(bird.w/2-2,8); x.closePath(); x.fill();
 x.fillStyle='#fff'; x.beginPath(); x.arc(4,-4,5,0,7); x.fill(); x.fillStyle='#111'; x.beginPath(); x.arc(6,-3,2.5,0,7); x.fill();
 x.fillStyle='#ff5a5a'; x.beginPath(); x.moveTo(0,6); x.lineTo(-2+Math.sin(frame*0.5)*3, bird.h/2+2); x.lineTo(4+Math.sin(frame*0.5)*3, bird.h/2+2); x.closePath(); x.fill();
 x.shadowBlur=0; x.restore();
 parts.forEach(p=>{ x.globalAlpha=Math.max(0,p.life); x.fillStyle=p.c; x.fillRect(p.x,p.y,p.s,p.s);}); x.globalAlpha=1;
 // energy
 x.fillStyle='rgba(0,0,0,0.45)'; x.fillRect(8,H-16,W-16,8); x.fillStyle=energy>30?'#ffd75e':'#ff5a5a'; x.fillRect(8,H-16,(W-16)*energy/100,8);
 x.font='700 7px Arial'; x.fillStyle='#fff'; x.fillText('ENERGY '+Math.floor(energy)+'%',12,H-10);
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.45)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#fff8b0'); g.addColorStop(1,'#ffd75e'); x.fillStyle=g; x.font='900 32px Arial Black'; x.fillText('FLAPPY',W/2,H/2-36);
  x.font='900 18px Arial Black'; x.fillStyle='#fff'; x.fillText('BIRD',W/2,H/2-12);
  x.font='700 10px Arial'; x.fillStyle='#fff'; x.fillText('TAP FAST • DASH BREAKS PIPES',W/2,H/2+8);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST,W/2,H/2+26);}
  x.font='900 13px Arial'; x.fillStyle='rgba(255,255,255,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO FLAP',W/2,H/2+48); x.textAlign='left';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.62)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(255,255,255,0.96)'; x.strokeStyle='rgba(255,215,94,0.5)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-64,332,128,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle='#ff6a6a'; x.fillText('CRASHED!',W/2,H/2-30); x.font='700 12px Arial'; x.fillStyle='#111'; x.fillText('SCORE '+score+' • PIPES '+pipes,W/2,H/2-6);
  if(score>=BEST && score>0){x.fillStyle='#2a8a0a'; x.font='900 13px Arial'; x.fillText('★ NEW BEST ★',W/2,H/2+16);} else {x.fillStyle='#5a6a7a'; x.fillText('BEST: '+BEST,W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(0,0,0,0.6)'; x.fillText('tap to flap again',W/2,H/2+38); x.textAlign='left';
 }
}
document.getElementById('flapB').addEventListener('pointerdown',e=>{e.preventDefault(); flap(e.detail>=2);});
document.getElementById('dashB').addEventListener('pointerdown',e=>{e.preventDefault(); dash();});
cv.addEventListener('pointerdown',e=>{
 ac();
 if(state==='ready'||state==='dead'){ flap(); return; }
 let r=cv.getBoundingClientRect(); let y=(e.clientY-r.top)/r.height*H;
 if(y>H*0.7 && energy>=35) dash(); else flap(e.detail>=2);
});
document.addEventListener('keydown',e=>{ if(e.code==='Space'){e.preventDefault(); flap();} if(e.code==='KeyX') dash(); });
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('flappy_mute',MUTED?'1':'0')}catch(e2){}});
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