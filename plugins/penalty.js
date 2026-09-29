const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "penalty",
  alias: ["penaltykick","football","soccer"],
  react: "⚽",
  desc: "Penalty Kick - Aim & Curve",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.penaltyLimit=global.penaltyLimit||{}; const now=Date.now();
if(global.penaltyLimit[from]&&now-global.penaltyLimit[from]<10000) return reply(`⏳ ${Math.ceil((10000-(now-global.penaltyLimit[from]))/1000)}s cooldown`);
global.penaltyLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#1a5a2a,#050e08 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#a8ff60;text-shadow:0 0 12px #a8ff6088;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#8ab88a}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(168,255,96,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#8ab88a}
.hr b{font:900 12px 'Arial Black';color:#a8ff60}
.mbtn{width:30px;height:30px;border:1px solid rgba(168,255,96,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(168,255,96,.35);border-radius:14px;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#3a8a4a,#1a3a22);box-shadow:0 0 22px rgba(168,255,96,.18);aspect-ratio:404/580}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.pd{height:50px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 11px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#aimB{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
#kickB{background:linear-gradient(#a8ff60,#5ab00a 60%,#2a5a05)}
#curveB{grid-column:span 2;height:40px;background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805}
.hint{text-align:center;font:600 8px Arial;color:#8ab88a;margin-top:4px}
.meter{height:10px;background:rgba(0,0,0,.5);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.15);margin-top:4px;display:flex}
.meterFill{height:100%;transition:width.05s}
</style>
<div id="app">
<div class="hdr"><div class="tt">⚽ PENALTY ULTRA<small>CURVE EDITION</small></div><div class="hrs"><div class="hr"><i>GOALS</i><b id="sc">0/5</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>LEVEL</i><b id="lv">1</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="404" height="580"></canvas></div>
<div class="meter"><div id="powerBar" style="width:0%;background:linear-gradient(90deg,#a8ff60,#ffd75e)"></div><div id="curveBar" style="width:50%;background:linear-gradient(90deg,#58c7ff,#9a7aff)"></div></div>
<div class="pads"><button class="pd" id="aimB">🎯 AIM MODE</button><button class="pd" id="kickB">🦶 KICK!</button><button class="pd" id="curveB">↩️ CURVE: <span id="curveTxt">CENTER</span> • TAP TO CHANGE</button></div>
<div class="hint">1. Drag aim on goal • 2. Hold KICK for power • 3. Set curve • Keeper gets harder each level</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), W=404, H=580, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), lvEl=document.getElementById('lv'), powerBar=document.getElementById('powerBar'), curveTxt=document.getElementById('curveTxt');
let BEST=0; try{BEST=parseInt(localStorage.getItem('penalty_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('penalty_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v,at,sl){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.setValueAtTime(f,n); if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d); g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.03);}catch(e){}}
function noiz(d,v,at,fc){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(); s.buffer=b; f.type='lowpass'; f.frequency.value=fc||1200; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.03);}catch(e){}}
const SFX={ kick:()=>{noiz(.12,.22,0,2000); tone(200,.15,'sawtooth',.18);}, goal:()=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,.12,'square',.12,i*.07)); noiz(.5,.25,0.2,1000);}, save:()=>{tone(180,.3,'sawtooth',.2); noiz(.2,.2,0,600);}, miss:()=>{[400,300,200].forEach((f,i)=>tone(f,.15,'sawtooth',.12,i*.1));} };
let state='aim', goals=0, attempts=0, level=1, frame=0, overT=0, shake=0;
let aimX=0, aimY=-40, power=0, charging=false, curve=0, ball=null, keeper=null, crowd=[], confetti=[];
function resetRound(){
 aimX=(Math.random()-0.5)*80; aimY=-30+Math.random()*-30; power=0; curve=Math.random()<0.5? (Math.random()<0.5?-1:1)* (0.3+Math.random()*0.7):0;
 ball=null; keeper={x:0,y:0,vx:0,vy:0,dive:0,tx:0,ty:0,saved:false}; state='aim';
}
function resetGame(){ goals=0; attempts=0; level=1; crowd=[]; for(let i=0;i<80;i++) crowd.push({x:Math.random()*W,y:Math.random()*60,s:0.5+Math.random()*1}); resetRound(); scEl.textContent='0/5'; lvEl.textContent='1'; }
resetGame();
function shoot(){
 if(state!=='aim') return;
 ac(); if(power<5) power=30+Math.random()*40;
 let targetX= aimX + curve*35;
 let targetY= aimY - power*0.3;
 ball={x:0,y:120,z:0,vx: targetX*0.06* (power/60), vy: -3 - power*0.06, vz: targetY*0.05, spin:curve, t:0, trail:[]};
 keeper.tx= targetX + (Math.random()-0.5)* (30 - level*2); keeper.ty= targetY + (Math.random()-0.5)*20;
 keeper.dive=0; state='kick'; SFX.kick();
}
let nextConf=0;
function update(){
 frame++; if(shake>0)shake*=0.88;
 if(charging){ power=Math.min(100,power+1.8); powerBar.style.width=power+'%'; }
 if(state==='kick' && ball){
  ball.t+=0.02; ball.x+=ball.vx; ball.y+=ball.vy; ball.z+=ball.vz; ball.vy+=0.08; ball.trail.push({x:ball.x,y:ball.y,z:ball.z}); if(ball.trail.length>12) ball.trail.shift();
  ball.vx+=ball.spin*0.03;
  // keeper AI
  let kSpeed= 1.6 + level*0.28;
  keeper.x+=(keeper.tx-keeper.x)*0.12*kSpeed; keeper.y+=(keeper.ty-keeper.y)*0.12*kSpeed;
  keeper.dive+=0.04;
  if(ball.y < 10){
   let dx= ball.x-keeper.x, dy= (ball.z)-keeper.y;
   if(Math.hypot(dx,dy)< 22 + level*1.2){
    // save
    keeper.saved=true; state='save'; shake=10; SFX.save(); setTimeout(()=>{ attempts++; if(attempts>=5){ if(goals>=3){ level++; lvEl.textContent=level; goals=0; attempts=0; } else { endGame(); } } resetRound(); },900);
   } else if(Math.abs(ball.x)>110 || ball.z<-90 || ball.z>10){
    // miss out
    state='miss'; shake=6; SFX.miss(); setTimeout(()=>{ attempts++; if(attempts>=5){ if(goals>=3){ level++; lvEl.textContent=level; goals=0; attempts=0; } else endGame(); } resetRound(); },900);
   } else if(ball.y<= -20){
    // goal
    goals++; attempts++; scoreUpdate(); state='goal'; shake=4; SFX.goal(); for(let i=0;i<24;i++) confetti.push({x:W/2+ (Math.random()-0.5)*120,y:80+Math.random()*40,vx:(Math.random()-0.5)*6,vy:-Math.random()*5-1,life:1,c:['#a8ff60','#ffd75e','#58c7ff'][Math.floor(Math.random()*3)]});
    if(goals>=BEST){ BEST=goals; try{localStorage.setItem('penalty_best',String(BEST))}catch(e){} bsEl.textContent=BEST; }
    setTimeout(()=>{ if(attempts>=5){ if(goals>=3){ level++; lvEl.textContent=level; goals=0; attempts=0; } else endGame(); } resetRound(); },1200);
   }
  }
  if(ball.y>140){ state='miss'; SFX.miss(); setTimeout(()=>{ attempts++; resetRound(); if(attempts>=5) endGame(); },600); }
 }
 confetti.forEach(c=>{ c.x+=c.vx; c.y+=c.vy; c.vy+=0.12; c.life-=0.015; });
 confetti=confetti.filter(c=>c.life>0);
}
function scoreUpdate(){ scEl.textContent=goals+'/5'; }
function endGame(){ state='over'; overT=performance.now(); }
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle='#1a4a2a'; x.fillRect(0,0,W,H);
 // crowd
 x.fillStyle='rgba(0,0,0,0.25)'; crowd.forEach(c=>{ x.fillRect(c.x,c.y,4,8); });
 // stadium lights
 x.fillStyle='rgba(255,255,255,0.04)'; x.fillRect(0,0,W,70);
 // goal
 let goalW=220, goalH=110, gx=W/2-goalW/2, gy=40;
 x.fillStyle='#e0e0e0'; x.fillRect(gx-4,gy-4,goalW+8,goalH+8);
 x.fillStyle='#fff'; x.strokeStyle='#fff'; x.lineWidth=2;
 // net
 x.fillStyle='#1e6e2e'; x.fillRect(gx,gy,goalW,goalH);
 x.strokeStyle='rgba(255,255,255,0.25)'; x.lineWidth=0.8;
 for(let i=0;i<=goalW;i+=14){ x.beginPath(); x.moveTo(gx+i,gy); x.lineTo(gx+i,gy+goalH); x.stroke(); }
 for(let i=0;i<=goalH;i+=12){ x.beginPath(); x.moveTo(gx,gy+i); x.lineTo(gx+goalW,gy+i); x.stroke(); }
 // keeper
 if(keeper){
  let kx=W/2+keeper.x, ky=gy+goalH/2+keeper.y;
  x.save(); x.translate(kx,ky);
  if(keeper.dive>0) x.rotate(keeper.dive* (keeper.tx>0?1:-1)*0.6);
  x.fillStyle='#ffcc33'; x.fillRect(-10,-18,20,22);
  x.fillStyle='#111'; x.fillRect(-8,-18,16,6);
  x.fillStyle='#f2c9a0'; x.beginPath(); x.arc(0,-22,7,0,7); x.fill();
  x.fillStyle='#111'; x.fillRect(-10,4,8,12); x.fillRect(2,4,8,12);
  x.fillStyle='#fff'; x.beginPath(); x.arc(12, -6,5,0,7); x.fill(); x.beginPath(); x.arc(-12,-6,5,0,7); x.fill();
  x.restore();
 }
 // aim
 if(state==='aim'){
  let ax=W/2+aimX, ay=gy+goalH/2+aimY;
  x.strokeStyle='rgba(255,255,255,0.9)'; x.lineWidth=1.5; x.setLineDash([5,4]);
  x.beginPath(); x.arc(ax,ay,14+Math.sin(frame*0.18)*2,0,7); x.stroke(); x.setLineDash([]);
  x.fillStyle='#ff3b3b'; x.beginPath(); x.arc(ax,ay,3,0,7); x.fill();
  x.fillStyle='#fff'; x.font='700 9px Arial'; x.textAlign='center'; x.fillText('AIM',ax,ay-18); x.textAlign='left';
 }
 // ball
 if(ball){
  ball.trail.forEach((t,i)=>{ x.globalAlpha=i/ ball.trail.length*0.4; x.fillStyle='#fff'; x.beginPath(); x.arc(W/2+t.x, gy+goalH/2+t.z - t.y*0.1, 2+i*0.2,0,7); x.fill();}); x.globalAlpha=1;
  let bx=W/2+ball.x, by=gy+goalH/2+ball.z - ball.y*0.15;
  let scale= 0.6 + (1 - (ball.y/120))*0.8;
  x.fillStyle='#fff'; x.shadowColor='rgba(0,0,0,0.4)'; x.shadowBlur=8; x.beginPath(); x.arc(bx,by,7*scale,0,7); x.fill(); x.shadowBlur=0;
  x.fillStyle='#111'; x.beginPath(); x.arc(bx-1*scale,by-1*scale,2.5*scale,0,7); x.fill(); x.beginPath(); x.arc(bx+2*scale,by+1*scale,2*scale,0,7); x.fill();
  // shadow on ground
  x.fillStyle='rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(W/2+ball.x*0.3, 210, 8*scale,3*scale,0,0,7); x.fill();
 }else{
  // ball at spot
  let bx=W/2, by= H-80;
  x.fillStyle='rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(bx,by+8,10,3,0,0,7); x.fill();
  x.fillStyle='#fff'; x.beginPath(); x.arc(bx,by,9,0,7); x.fill(); x.fillStyle='#111'; x.beginPath(); x.arc(bx-2,by-2,3,0,7); x.fill(); x.beginPath(); x.arc(bx+3,by+1,2.5,0,7); x.fill();
 }
 // confetti
 confetti.forEach(c=>{ x.globalAlpha=c.life; x.fillStyle=c.c; x.fillRect(c.x,c.y,3,6);}); x.globalAlpha=1;
 // power text
 if(state==='aim'){
  x.fillStyle='rgba(0,0,0,0.55)'; x.fillRect(8,H-56,W-16,22); x.fillStyle='#fff'; x.font='700 9px Arial'; x.fillText('POWER: '+Math.floor(power)+'% | CURVE: '+(curve>0.3?'RIGHT↷':curve<-0.3?'LEFT↶':'STRAIGHT')+' | DRAG AIM INSIDE GOAL',12,H-42);
 }
 if(state==='goal'){ x.textAlign='center'; x.font='900 26px Arial Black'; x.fillStyle='#a8ff60'; x.fillText('GOOOAL! ⚽',W/2, H/2); x.textAlign='left'; }
 if(state==='save'){ x.textAlign='center'; x.font='900 22px Arial Black'; x.fillStyle='#ff6a6a'; x.fillText('SAVED! 🧤',W/2,H/2); x.textAlign='left'; }
 if(state==='miss'){ x.textAlign='center'; x.font='900 22px Arial Black'; x.fillStyle='#ffaa3c'; x.fillText('MISS! 😬',W/2,H/2); x.textAlign='left'; }
 if(state==='over'){
  x.fillStyle='rgba(0,0,0,0.7)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(20,40,20,0.92)'; x.strokeStyle='rgba(168,255,96,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-70,332,140,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle=goals>=3?'#a8ff60':'#ff6a6a'; x.fillText(goals>=3?'QUALIFIED!':'ELIMINATED',W/2,H/2-32);
  x.font='700 12px Arial'; x.fillStyle='#fff'; x.fillText('GOALS '+goals+'/5 • LEVEL '+level+' • BEST '+BEST,W/2,H/2-8);
  x.font='700 11px Arial'; x.fillStyle='rgba(255,255,255,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to play again',W/2,H/2+22); x.textAlign='left';
 }
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.55)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#d0ff9a'); g.addColorStop(1,'#5ab00a'); x.fillStyle=g; x.font='900 28px Arial Black'; x.fillText('PENALTY KICK',W/2,H/2-36);
  x.font='700 10px Arial'; x.fillStyle='#8ab88a'; x.fillText('AIM • POWER • CURVE • BEAT THE KEEPER',W/2,H/2-10);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST+' GOALS',W/2,H/2+10);}
  x.font='900 13px Arial'; x.fillStyle='rgba(168,255,96,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO START',W/2,H/2+38); x.textAlign='left';
  state='aim';
 }
}
document.getElementById('aimB').addEventListener('pointerdown',e=>{
 e.preventDefault(); ac();
 let r=cv.getBoundingClientRect(); function move(ev){ let x=(ev.touches?ev.touches[0].clientX:ev.clientX)-r.left; let y=(ev.touches?ev.touches[0].clientY:ev.clientY)-r.top; aimX= (x/r.width*W - W/2); aimY= (y/r.height*H - (40+55)); aimX=Math.max(-100,Math.min(100,aimX)); aimY=Math.max(-85,Math.min(15,aimY)); }
 function up(){ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); document.removeEventListener('touchmove',move); document.removeEventListener('touchend',up); }
 document.addEventListener('pointermove',move); document.addEventListener('pointerup',up); document.addEventListener('touchmove',move,{passive:false}); document.addEventListener('touchend',up);
});
cv.addEventListener('pointerdown',e=>{
 ac();
 if(state==='over'&&performance.now()-overT>600){ resetGame(); return; }
 if(state==='aim'){ let r=cv.getBoundingClientRect(); let x=(e.clientX-r.left)/r.width*W - W/2; let y=(e.clientY-r.top)/r.height*H - (95); aimX=Math.max(-100,Math.min(100,x)); aimY=Math.max(-85,Math.min(15,y)); }
});
document.getElementById('kickB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); charging=true; power=0;});
document.getElementById('kickB').addEventListener('pointerup',()=>{ charging=false; shoot(); });
document.getElementById('kickB').addEventListener('pointerleave',()=>{ if(charging){charging=false; shoot();} });
document.getElementById('curveB').addEventListener('pointerdown',e=>{
 e.preventDefault(); ac(); curve+=0.7; if(curve>1.2) curve=-1.2; document.getElementById('curveTxt').textContent= curve>0.3?'RIGHT↷':curve<-0.3?'LEFT↶':'CENTER';
});
document.addEventListener('keydown',e=>{
 if(e.code==='Space'){ if(charging){charging=false; shoot();} else {charging=true; power=0;}}
 if(e.code==='KeyC'){ curve+=0.7; if(curve>1.2) curve=-1.2; document.getElementById('curveTxt').textContent= curve>0.3?'RIGHT↷':curve<-0.3?'LEFT↶':'CENTER'; }
});
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('penalty_mute',MUTED?'1':'0')}catch(e2){}});
function loop(){ update(); draw(); requestAnimationFrame(loop); }
resetGame(); requestAnimationFrame(loop);
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