const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "shooter",
  alias: ["spaceshooter","space","galaxy","ultrashooter"],
  react: "🚀",
  desc: "ULTRA Space Shooter - All Features",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.shooterLimit=global.shooterLimit||{}; const now=Date.now();
if(global.shooterLimit[from]&&now-global.shooterLimit[from]<12000) return reply(`⏳ ${Math.ceil((12000-(now-global.shooterLimit[from]))/1000)}s cooldown`);
global.shooterLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 20% 5%,#13205a,#020410 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:440px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:3px 2px 5px}
.tt{font:900 15px 'Arial Black';color:#7df;text-shadow:0 0 12px #7df8;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#6a8ab8}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(125,221,255,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#6a8ab8}
.hr b{font:900 12px 'Arial Black';color:#7df}
.mbtn{width:30px;height:30px;border:1px solid rgba(125,221,255,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(125,221,255,.35);border-radius:14px;overflow:hidden;background:#000;box-shadow:0 0 22px rgba(125,221,255,.2);aspect-ratio:404/620}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:64px 1fr 64px;gap:6px;margin-top:6px;align-items:end}
.joy{width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#2a3a6a,#0f1a33);border:2px solid rgba(125,221,255,.25);position:relative;touch-action:none}
.joyKnob{width:28px;height:28px;border-radius:50%;background:linear-gradient(#7df,#1a6ed6);position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);box-shadow:0 0 10px #7df8}
.mid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.pd{height:48px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 11px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#shootB{background:linear-gradient(#ff7a5a,#c42a1a 60%,#6a1208)}
#weaponB{background:linear-gradient(#9a7aff,#5a2ad6 60%,#2a145a)}
#boostB{grid-column:span 3;height:40px;background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805;font:900 12px 'Arial Black'}
.bar{height:8px;background:rgba(0,0,0,.5);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.15);margin-top:4px}
.barFill{height:100%;transition:width.15s}
.hint{text-align:center;font:600 8px Arial;color:#6a8ab8;margin-top:4px}
.weapons{display:flex;gap:4px;justify-content:center;margin-top:4px}
.wTag{font:800 7.5px Arial;padding:2px 6px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4)}
.wTag.on{border-color:#ffd75e;color:#ffd75e;box-shadow:0 0 8px #ffd70055}
</style>
<div id="app">
<div class="hdr"><div class="tt">🚀 STAR STRIKE ULTRA<small>ALL WEAPONS • SHOP • SKINS</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>WAVE</i><b id="wv">1</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="404" height="620"></canvas></div>
<div class="weapons"><div class="wTag on" id="wt1">🔫 SINGLE</div><div class="wTag" id="wt2">🔱 DOUBLE</div><div class="wTag" id="wt3">💠 SPREAD</div><div class="wTag" id="wt4">⚡ LASER</div></div>
<div class="bar"><div class="barFill" id="enBar" style="width:35%;background:linear-gradient(90deg,#ffd75e,#ff9a3c)"></div></div>
<div class="pads"><div class="joy" id="joy"><div class="joyKnob" id="knob"></div></div><div class="mid"><button class="pd" id="shootB">🔥 HOLD FIRE</button><button class="pd" id="weaponB">🔄 SWAP</button></div><div class="joy" id="joy2" style="display:grid;place-items:center;font:900 10px Arial">AIM</div><button class="pd" id="boostB">☄️ NUKE (25%) • HOLD = BLACK HOLE (60%)</button></div>
<div class="hint">JOYSTICK move • HOLD FIRE • SWAP weapons • NUKE clears • Survive meteor storms</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), W=404, H=620, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), wvEl=document.getElementById('wv'), enBar=document.getElementById('enBar');
let BEST=0; try{BEST=parseInt(localStorage.getItem('star_ultra_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('star_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v,at,sl){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.setValueAtTime(f,n); if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d); g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.03);}catch(e){}}
function noiz(d,v,at,fc){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(); s.buffer=b; f.type='lowpass'; f.frequency.value=fc||1200; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.03);}catch(e){}}
const SFX={ shoot:()=>{tone(900,.05,'square',.09);}, shoot2:()=>{tone(700,.05,'square',.09); tone(1100,.06,'square',.07,.02);}, laser:()=>{tone(200,.4,'sawtooth',.18,0,1200); noiz(.2,.12,0,3000);}, hit:()=>{noiz(.1,.18,0,800); tone(220,.1,'sawtooth',.13);}, boom:()=>{noiz(.45,.32,0,500); [200,120,60].forEach((f,i)=>tone(f,.35,'sawtooth',.2,i*.07,f*.45));}, power:()=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,.1,'sine',.12,i*.05));}, nuke:()=>{noiz(.9,.45,0,2200); tone(60,.9,'sawtooth',.35,0,18);}, blackhole:()=>{noiz(1.2,.35,0,400); tone(400,.8,'sawtooth',.22,0,40); tone(800,.8,'sine',.15,0,200);}};
// GAME STATE
let state='ready', score=0, wave=1, energy=35, lives=3, frame=0, shake=0, overT=0, weapon=0, combo=0, comboT=0;
let player, bullets=[], enemies=[], parts=[], stars=[], pups=[], boss=null, bossWarn=0, meteors=[], blackhole=null;
let keys={l:0,r:0};
function reset(){
 score=0; wave=1; energy=35; lives=3; bullets=[]; enemies=[]; parts=[]; pups=[]; boss=null; bossWarn=0; meteors=[]; blackhole=null; weapon=0; combo=0; comboT=0;
 player={x:W/2,y:H-70,w:22,h:22,vx:0,vy:0,shield:0,double:0,speed:6.2,skin:0};
 stars=[]; for(let i=0;i<110;i++) stars.push({x:Math.random()*W,y:Math.random()*H,s:0.4+Math.random()*2.8,sp:0.6+Math.random()*3.2,c:Math.random()<.1?'#ffd75e':'#fff'});
 scEl.textContent='0'; wvEl.textContent='1'; updWeaponUI();
}
function updWeaponUI(){
 document.querySelectorAll('.wTag').forEach((e,i)=>e.classList.toggle('on',i===weapon));
}
function burst(px,py,n,c){ for(let i=0;i<n;i++) parts.push({x:px,y:py,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:1,c:c||'#7df',s:1+Math.random()*3}); }
function spawnEnemy(){
 if(boss||blackhole) return;
 if(frame%Math.max(8, 44-wave*2)===0){
  let r=Math.random();
  if(r<.4) enemies.push({t:'drone',x:20+Math.random()*(W-40),y:-30,hp:1,vy:1.6+wave*0.22+Math.random()*1.2,amp:1+Math.random()*1.5});
  else if(r<.7) enemies.push({t:'fighter',x:30+Math.random()*(W-60),y:-35,hp:2+Math.floor(wave/3),vy:1.1+wave*0.14,shoot:50+Math.random()*50});
  else if(r<.85) enemies.push({t:'tank',x:40+Math.random()*(W-80),y:-40,hp:4+wave,vy:0.8+wave*0.08,shoot:70});
  else enemies.push({t:'asteroid',x:Math.random()*W,y:-45,hp:3+Math.floor(wave/2),vy:1.3+Math.random(),rot:Math.random()*6,vr:(Math.random()-.5)*0.15});
 }
 if(Math.random()<0.012) pups.push({t:['double','shield','spread','laser'][Math.floor(Math.random()*4)],x:Math.random()*(W-30)+15,y:-20,vy:1.5,rot:0});
 if(wave>2 && Math.random()<0.006) meteors.push({x:Math.random()*W,y:-20,vy:4+Math.random()*3,vx:(Math.random()-.5)*2,rot:Math.random()*6});
}
function spawnBoss(){
 boss={x:W/2,y:-90,hp:40+wave*8,max:40+wave*8,vy:1.3,dir:1,shoot:0,phase:0,mode:'enter'}; bossWarn=0;
}
let shootCd=0;
function fire(){
 if(shootCd>0||state!=='play') return;
 if(weapon===0){ bullets.push({x:player.x,y:player.y-14,vy:-11}); shootCd=10; SFX.shoot(); }
 if(weapon===1){ bullets.push({x:player.x-9,y:player.y-10,vy:-10}); bullets.push({x:player.x+9,y:player.y-10,vy:-10}); shootCd=11; SFX.shoot2(); }
 if(weapon===2){ for(let k=-2;k<=2;k++){ bullets.push({x:player.x,y:player.y-10,vy:-9+Math.abs(k)*-0.3,vx:k*1.3});} shootCd=14; SFX.shoot2(); }
 if(weapon===3){ bullets.push({x:player.x,y:player.y-20,vy:-14,laser:true,life:12}); shootCd=6; if(frame%4===0) SFX.laser(); }
}
function update(){
 frame++; if(shake>0)shake*=0.88; if(comboT>0)comboT--; else combo=0;
 if(player.shield>0)player.shield--; if(player.double>0)player.double--;
 if(shootCd>0)shootCd--;
 if(state!=='play') return;
 stars.forEach(s=>{ s.y+=s.sp*(blackhole?0.2:1); if(s.y>H){s.y=-10; s.x=Math.random()*W;}});
 spawnEnemy();
 // joystick move
 player.x+=player.vx; player.y+=player.vy; player.vx*=0.86; player.vy*=0.86;
 player.x=Math.max(18,Math.min(W-18,player.x)); player.y=Math.max(H*0.45,Math.min(H-22,player.y));
 // bullets
 for(let i=bullets.length-1;i>=0;i--){
  let b=bullets[i]; if(b.laser){ b.life--; b.y-=2; if(b.life<=0) bullets.splice(i,1); }
  else{ b.y+=b.vy; if(b.vx) b.x+=b.vx; if(b.y<-30||b.y>H+30||b.x<-20||b.x>W+20) bullets.splice(i,1); }
 }
 enemies.forEach(en=>{ en.y+=en.vy; if(en.t==='drone') en.x+=Math.sin(frame*0.04+en.y*0.01)*en.amp; if(en.t==='fighter'||en.t==='tank'){ en.shoot--; if(en.shoot<=0){en.shoot=en.t==='tank'?55:75; bullets.push({x:en.x,y:en.y+12,vy:3.4,enemy:true}); if(en.t==='tank'&&Math.random()<.5){ bullets.push({x:en.x-10,y:en.y+8,vy:3, vx:-0.8, enemy:true}); bullets.push({x:en.x+10,y:en.y+8,vy:3, vx:0.8, enemy:true});}} } if(en.t==='asteroid') en.rot+=en.vr; });
 meteors.forEach(me=>{ me.y+=me.vy; me.x+=me.vx; me.rot+=0.08; });
 for(let i=meteors.length-1;i>=0;i--){ if(meteors[i].y>H+30) meteors.splice(i,1); else if(Math.hypot(meteors[i].x-player.x, meteors[i].y-player.y)<26){ meteors.splice(i,1); if(player.shield<=0){lives--; shake=14; burst(player.x,player.y,16,'#ff8a3c'); SFX.hit(); if(lives<=0) die();} } }
 // black hole
 if(blackhole){ blackhole.life--; blackhole.r+=1.2; enemies.forEach(en=>{ let dx=blackhole.x-en.x, dy=blackhole.y-en.y, d=Math.hypot(dx,dy); if(d<blackhole.r+80){ en.x+=dx*0.04; en.y+=dy*0.04; if(d<24){ burst(en.x,en.y,10,'#9a7aff'); score+=60; enemies.splice(enemies.indexOf(en),1);} } }); if(blackhole.life<=0) blackhole=null; }
 // collisions
 for(let i=bullets.length-1;i>=0;i--){ let b=bullets[i]; if(b.enemy) continue;
  let hit=false;
  for(let j=enemies.length-1;j>=0;j--){ let en=enemies[j]; if(Math.abs(b.x-en.x)<19 && Math.abs(b.y-en.y)<19){ en.hp-=b.laser?2:1; if(!b.laser) bullets.splice(i,1); hit=true; burst(en.x,en.y,5,'#ff8a8a'); score+=10; energy=Math.min(100,energy+1.2); combo++; comboT=90; if(en.hp<=0){ enemies.splice(j,1); burst(en.x,en.y,14,en.t==='asteroid'?'#9aa':'#ff5a5a'); score+=50+combo*2; if(Math.random()<0.18) pups.push({t:Math.random()<.6?'double':'shield',x:en.x,y:en.y,vy:1.3});} break; } }
  if(hit) continue;
  if(boss && Math.abs(b.x-boss.x)<48 && Math.abs(b.y-boss.y)<32){ if(!b.laser) bullets.splice(i,1); boss.hp-=b.laser?0.6:1; burst(b.x,b.y,4,'#ffd75e'); score+=6; energy=Math.min(100,energy+0.6); if(boss.hp<=0){ score+=800; burst(boss.x,boss.y,50,'#ffd75e'); burst(boss.x,boss.y,36,'#ff5a5a'); boss=null; wave++; wvEl.textContent=wave; energy=Math.min(100,energy+25); SFX.boom(); } }
 }
 for(let i=bullets.length-1;i>=0;i--){ let b=bullets[i]; if(!b.enemy) continue; if(Math.abs(b.x-player.x)<16 && Math.abs(b.y-player.y)<16){ bullets.splice(i,1); if(player.shield<=0){ lives--; shake=12; SFX.hit(); burst(player.x,player.y,12,'#7df'); if(lives<=0) die(); } } }
 for(let j=enemies.length-1;j>=0;j--){ let en=enemies[j]; if(Math.hypot(en.x-player.x,en.y-player.y)<22){ enemies.splice(j,1); burst(en.x,en.y,14,'#ff5a5a'); if(player.shield<=0){ lives--; shake=12; SFX.hit(); if(lives<=0) die(); } } }
 for(let i=pups.length-1;i>=0;i--){ let p=pups[i]; p.y+=p.vy; p.rot+=0.05; if(p.y>H+20) pups.splice(i,1); else if(Math.hypot(p.x-player.x,p.y-player.y)<22){ if(p.t==='double'||p.t==='spread'||p.t==='laser'){ weapon={double:1,spread:2,laser:3}[p.t]; updWeaponUI(); SFX.power(); } else if(p.t==='shield'){ player.shield=600; SFX.power(); } pups.splice(i,1); score+=80; } }
 if(boss){
  if(boss.y<90) boss.y+=boss.vy; else { boss.x+=boss.dir*2.1; if(boss.x<70||boss.x>W-70) boss.dir*=-1; boss.shoot++; if(boss.shoot>30){boss.shoot=0; let pat=boss.phase%3; if(pat===0){ for(let k=-2;k<=2;k++) bullets.push({x:boss.x+k*12,y:boss.y+22,vy:3.4,enemy:true}); } else if(pat===1){ for(let a=0;a<10;a++){ let ang=a/10*6.283; bullets.push({x:boss.x,y:boss.y+10,vx:Math.cos(ang)*2.2,vy:Math.sin(ang)*2.2+0.8,enemy:true}); } } else { bullets.push({x:boss.x,y:boss.y+20,vy:5,enemy:true,homing:true,tx:player.x}); } boss.phase++; } bullets.forEach(b=>{ if(b.homing){ b.vx+=(b.tx-b.x)*0.008; } }); }
  if(Math.hypot(boss.x-player.x,boss.y-player.y)<46){ if(player.shield<=0 && frame%20===0){ lives--; shake=14; if(lives<=0) die(); } }
 }else{ if(score>0 && score>wave*900 && bossWarn===0){ bossWarn=140; } if(bossWarn>0){ bossWarn--; if(bossWarn===1) spawnBoss(); } }
 scEl.textContent=score; enBar.style.width=energy+'%';
 for(let i=parts.length-1;i>=0;i--){ let p=parts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.09; if((p.life-=0.032)<=0) parts.splice(i,1); }
}
function die(){ state='dead'; overT=performance.now(); shake=20; SFX.boom(); burst(player.x,player.y,34,'#7df'); if(score>BEST){BEST=score; try{localStorage.setItem('star_ultra_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} }
// DRAW
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle='#000'; x.fillRect(0,0,W,H);
 x.fillStyle='#fff'; stars.forEach(s=>{ x.globalAlpha=0.25+s.s*0.18; x.fillStyle=s.c; x.fillRect(s.x,s.y,s.s,s.s);}); x.globalAlpha=1;
 let neb=x.createRadialGradient(W*0.65,H*0.18,0,W*0.65,H*0.18,300); neb.addColorStop(0,'rgba(125,221,255,0.07)'); neb.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=neb; x.fillRect(0,0,W,H);
 if(blackhole){ x.save(); x.translate(blackhole.x,blackhole.y); let g=x.createRadialGradient(0,0,0,0,0,blackhole.r); g.addColorStop(0,'#000'); g.addColorStop(0.4,'#4a2ad6'); g.addColorStop(1,'rgba(90,40,255,0)'); x.fillStyle=g; x.beginPath(); x.arc(0,0,blackhole.r,0,7); x.fill(); x.rotate(frame*0.08); x.strokeStyle='#9a7aff'; x.lineWidth=2; x.beginPath(); x.arc(0,0,blackhole.r*0.6,0,5); x.stroke(); x.restore(); }
 // player
 if(state==='play' || (frame%10<7)){
  x.save(); x.translate(player.x,player.y);
  if(player.shield>0){ x.shadowColor='#7df'; x.shadowBlur=14+Math.sin(frame*0.25)*6; x.strokeStyle='rgba(125,221,255,'+(0.28+Math.sin(frame*0.18)*0.18)+')'; x.lineWidth=2; x.beginPath(); x.arc(0,0,24,0,7); x.stroke(); x.shadowBlur=0; }
  let grad=x.createLinearGradient(0,-18,0,18); grad.addColorStop(0,'#d6f0ff'); grad.addColorStop(0.5,'#3a8eff'); grad.addColorStop(1,'#0a2a6a');
  x.fillStyle=grad; x.beginPath(); x.moveTo(0,-20); x.lineTo(-11,14); x.lineTo(-5,9); x.lineTo(5,9); x.lineTo(11,14); x.closePath(); x.fill();
  x.fillStyle='#0a1a3a'; x.fillRect(-7,-3,14,9); x.fillStyle=weapon===3?'#ff3bff':'#ffd75e'; x.beginPath(); x.arc(0,-7,4.5,0,7); x.fill();
  x.fillStyle='rgba(255,160,80,'+(0.55+Math.random()*0.45)+')'; x.beginPath(); x.moveTo(-6,11); x.lineTo(0,20+Math.random()*7); x.lineTo(6,11); x.fill();
  if(weapon===1){ x.fillStyle='#ffd75e'; x.fillRect(-14,2,3,8); x.fillRect(11,2,3,8); }
  x.restore();
 }
 bullets.forEach(b=>{ x.shadowColor=b.enemy?'#ff5a5a':(b.laser?'#ff3bff':'#7df'); x.shadowBlur=8; x.fillStyle=b.enemy?'#ff5a5a':(b.laser?'#ff3bff':'#7df'); if(b.laser){ x.fillRect(b.x-1.5,b.y-18,3,22);} else x.fillRect(b.x-1.5,b.y-5,3,10); x.shadowBlur=0; });
 enemies.forEach(en=>{ x.save(); x.translate(en.x,en.y); if(en.t==='drone'){ x.fillStyle='#ff4a6a'; x.beginPath(); x.arc(0,0,11,0,7); x.fill(); x.fillStyle='#111'; x.fillRect(-7,-2,14,5); x.fillStyle='#ffd75e'; x.beginPath(); x.arc(0,-2,3,0,7); x.fill(); } else if(en.t==='fighter'){ x.fillStyle='#8a5cff'; x.beginPath(); x.moveTo(0,-13); x.lineTo(-13,11); x.lineTo(13,11); x.closePath(); x.fill(); x.fillStyle='#fff'; x.fillRect(-3,1,6,6);} else if(en.t==='tank'){ x.fillStyle='#ff9a3c'; x.fillRect(-16,-10,32,20); x.fillStyle='#6a3a0a'; x.fillRect(-4,-18,8,12); x.fillStyle='#111'; x.fillRect(-12,4,8,4); x.fillRect(4,4,8,4);} else { x.rotate(en.rot); x.fillStyle='#7a8a9a'; x.beginPath(); for(let i=0;i<7;i++){ let a=i/7*6.283; let r=13+Math.sin(i*1.7)*3; x.lineTo(Math.cos(a)*r,Math.sin(a)*r);} x.closePath(); x.fill(); } x.restore(); });
 meteors.forEach(me=>{ x.save(); x.translate(me.x,me.y); x.rotate(me.rot); x.fillStyle='#ff6a3c'; x.beginPath(); x.arc(0,0,10,0,7); x.fill(); x.fillStyle='#ffcc8a'; x.beginPath(); x.arc(2,2,3,0,7); x.fill(); x.restore(); });
 pups.forEach(p=>{ x.save(); x.translate(p.x,p.y); x.rotate(p.rot); x.shadowColor=p.t==='shield'?'#7df':'#ffd75e'; x.shadowBlur=12; x.fillStyle=p.t==='shield'?'#7df':(p.t==='laser'?'#ff3bff':'#ffd75e'); x.beginPath(); x.arc(0,0,11,0,7); x.fill(); x.shadowBlur=0; x.fillStyle='#111'; x.font='900 11px Arial'; x.textAlign='center'; x.fillText(p.t==='shield'?'S':p.t==='double'?'2X':p.t==='spread'?'SP':'LA',0,4); x.restore(); });
 if(boss){ x.save(); x.translate(boss.x,boss.y); let hp=boss.hp/boss.max; x.fillStyle='#222'; x.fillRect(-42,-40,84,7); x.fillStyle=hp>0.5?'#2ecc71':hp>0.25?'#f1c40f':'#ff3b3b'; x.fillRect(-42,-40,84*hp,7); x.fillStyle='#d0d6e0'; x.fillRect(-38,-28,76,32); x.fillStyle='#ff3b3b'; x.fillRect(-34,4,68,14); x.fillStyle='#111'; x.fillRect(-20,-20,12,10); x.fillRect(8,-20,12,10); x.fillStyle='#ffd75e'; x.beginPath(); x.arc(0,8,8,0,7); x.fill(); x.fillStyle='rgba(255,90,90,0.55)'; x.beginPath(); x.arc(0,18,16+Math.sin(frame*0.18)*3,0,7); x.fill(); x.restore(); }
 parts.forEach(p=>{ x.globalAlpha=Math.max(0,p.life); x.fillStyle=p.c; x.fillRect(p.x,p.y,p.s,p.s);}); x.globalAlpha=1;
 if(bossWarn>0){ x.fillStyle='rgba(255,40,40,'+(0.14+Math.sin(frame*0.2)*0.08)+')'; x.fillRect(0,0,W,H); x.textAlign='center'; x.font='900 22px Arial Black'; x.fillStyle='#ff5a5a'; x.fillText('⚠ BOSS INCOMING ⚠',W/2,H/2); x.textAlign='left'; }
 // HUD combo
 if(combo>4){ x.textAlign='center'; x.font='900 14px Arial Black'; x.fillStyle='#ffd75e'; x.fillText(combo+'x COMBO!',W/2,28); x.textAlign='left'; }
 x.fillStyle='rgba(0,0,0,0.5)'; x.fillRect(8,H-20,W-16,10); x.fillStyle=energy>60?'#ffd75e':'#ff5a5a'; x.fillRect(8,H-20,(W-16)*energy/100,10); x.font='700 8px Arial'; x.fillStyle='#fff'; x.fillText('ENERGY '+Math.floor(energy)+'% ❤️'.repeat(lives)+' '+['SINGLE','DOUBLE','SPREAD','LASER'][weapon],10,H-8);
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.58)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g2=x.createLinearGradient(0,H/2-30,0,H/2+10); g2.addColorStop(0,'#d6f0ff'); g2.addColorStop(1,'#7df'); x.fillStyle=g2; x.font='900 30px Arial Black'; x.fillText('STAR STRIKE',W/2,H/2-38); x.fillStyle='#7df'; x.font='900 16px Arial Black'; x.fillText('ULTRA',W/2,H/2-14);
  x.font='700 10px Arial'; x.fillStyle='#8ab8e8'; x.fillText('JOYSTICK • 4 WEAPONS • NUKE • BLACK HOLE',W/2,H/2+6);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST,W/2,H/2+24);}
  x.font='900 14px Arial'; x.fillStyle='rgba(255,255,255,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO LAUNCH',W/2,H/2+48); x.textAlign='left';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.62)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(20,30,60,0.92)'; x.strokeStyle='rgba(125,221,255,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-64,332,128,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 26px Arial Black'; x.fillStyle='#ff6a6a'; x.fillText('SHIP LOST',W/2,H/2-30); x.font='700 12px Arial'; x.fillStyle='#fff'; x.fillText('SCORE '+score+' • WAVE '+wave+' • '+['SINGLE','DOUBLE','SPREAD','LASER'][weapon],W/2,H/2-6);
  if(score>=BEST && score>0){x.fillStyle='#ffd75e'; x.font='900 13px Arial'; x.fillText('★ NEW RECORD ★',W/2,H/2+16);} else {x.fillStyle='#8ab8e8'; x.fillText('BEST: '+BEST,W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(255,255,255,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to respawn',W/2,H/2+38); x.textAlign='left';
 }
}
let joyActive=false, joyDX=0;
function setJoy(e,el,knob){
 let r=el.getBoundingClientRect(); let cx=r.left+r.width/2, cy=r.top+r.height/2;
 let px=(e.touches?e.touches[0].clientX:e.clientX), py=(e.touches?e.touches[0].clientY:e.clientY);
 let dx=px-cx, dy=py-cy; let d=Math.hypot(dx,dy); let max=22; if(d>max){ dx=dx/d*max; dy=dy/d*max; }
 knob.style.transform='translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px))';
 joyDX=dx/max; player.vx=joyDX*player.speed; player.vy=dy/max*player.speed;
}
const joy=document.getElementById('joy'), knob=document.getElementById('knob');
joy.addEventListener('pointerdown',e=>{ac(); joyActive=true; setJoy(e,joy,knob);});
joy.addEventListener('pointermove',e=>{ if(joyActive) setJoy(e,joy,knob);});
joy.addEventListener('pointerup',()=>{ joyActive=false; knob.style.transform='translate(-50%,-50%)'; player.vx*=0.5; player.vy*=0.5;});
document.getElementById('shootB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); let iv=setInterval(()=>{if(state==='play') fire(); else clearInterval(iv);},80); function up(){clearInterval(iv); document.removeEventListener('pointerup',up);} document.addEventListener('pointerup',up); fire();});
document.getElementById('weaponB').addEventListener('pointerdown',e=>{e.preventDefault(); ac(); weapon=(weapon+1)%4; updWeaponUI(); SFX.power();});
let boostHold=0, boostTimer=null;
document.getElementById('boostB').addEventListener('pointerdown',e=>{
 e.preventDefault(); ac(); boostHold=0; boostTimer=setInterval(()=>{boostHold+=100; if(boostHold>700 && energy>=60 &&!blackhole){ energy-=60; blackhole={x:player.x,y:player.y-60,r:12,life:180}; SFX.blackhole(); shake=10; clearInterval(boostTimer); } },100);
});
document.getElementById('boostB').addEventListener('pointerup',()=>{ clearInterval(boostTimer); if(!blackhole && boostHold<700 && energy>=25){ energy-=25; SFX.nuke(); shake=18; enemies.forEach(en=>{burst(en.x,en.y,12,'#ffd75e'); score+=en.hp*12;}); enemies=[]; meteors=[]; if(boss){boss.hp-=12; burst(boss.x,boss.y,20,'#ff5a5a');} } boostHold=0; });
cv.addEventListener('pointerdown',e=>{
 ac(); if(state==='ready'){state='play'; reset(); return;} if(state==='dead'&&performance.now()-overT>700){state='play'; reset(); return;}
 let r=cv.getBoundingClientRect(); let tx=(e.clientX-r.left)/r.width*W; let ty=(e.clientY-r.top)/r.height*H; if(ty<H*0.65) player.x+=(tx-player.x)*0.6;
});
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('star_mute',MUTED?'1':'0')}catch(e2){}});
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