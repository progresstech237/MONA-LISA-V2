const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "snake",
  alias: ["snakegame","nokia","slither"],
  react: "🐍",
  desc: "Snake Ultra - Neon Edition",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.snakeLimit=global.snakeLimit||{}; const now=Date.now();
if(global.snakeLimit[from]&&now-global.snakeLimit[from]<8000) return reply(`⏳ ${Math.ceil((8000-(now-global.snakeLimit[from]))/1000)}s cooldown`);
global.snakeLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#0a2a1a,#04080a 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#a8ff60;text-shadow:0 0 12px #a8ff6088;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#6a8a7a}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(168,255,96,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#6a8a7a}
.hr b{font:900 12px 'Arial Black';color:#a8ff60}
.mbtn{width:30px;height:30px;border:1px solid rgba(168,255,96,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(168,255,96,.35);border-radius:14px;overflow:hidden;background:#0a1410;box-shadow:0 0 22px rgba(168,255,96,.18);aspect-ratio:1/1}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:64px 1fr 64px;grid-template-rows:44px 44px;gap:6px;margin-top:6px;place-items:center}
.pd{width:64px;height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 14px Arial;color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none;background:linear-gradient(#2a4a3a,#1a2a22)}
#upB{grid-column:2}#leftB{grid-column:1;grid-row:2}#rightB{grid-column:3;grid-row:2}#downB{grid-column:2;grid-row:2}
.pd:active{transform:translateY(3px);box-shadow:none}
#turboB{grid-column:span 3;width:100%;height:40px;background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805;font:900 12px 'Arial Black';border-radius:12px;border:2px solid rgba(255,255,255,.15)}
.hint{text-align:center;font:600 8px Arial;color:#6a8a7a;margin-top:4px}
</style>
<div id="app">
<div class="hdr"><div class="tt">🐍 SNAKE ULTRA<small>NEON EDITION</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>LEN</i><b id="ln">3</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="400" height="400"></canvas></div>
<div class="pads"><button class="pd" id="upB">▲</button><button class="pd" id="leftB">◀</button><button class="pd" id="downB">▼</button><button class="pd" id="rightB">▶</button><button class="pd" id="turboB">⚡ HOLD TURBO (ENERGY)</button></div>
<div class="hint">Swipe on board to steer • Don't hit walls or yourself • Eat 🍎=grow, 💎=x3, 🌀=portal</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), W=400, H=400, DPR=2, GRID=20, COLS=20, ROWS=20, CELL=W/COLS;
cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), lnEl=document.getElementById('ln');
let BEST=0; try{BEST=parseInt(localStorage.getItem('snake_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('snake_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime,o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.value=f; g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.02);}catch(e){}}
const SFX={ eat:()=>{tone(600,.08,'square',.12); tone(900,.08,'square',.08);}, big:()=>{[523,659,784,1047].forEach((f,i)=>{setTimeout(()=>tone(f,.1,'sine',.12),i*60)});}, die:()=>{[600,400,250,150].forEach((f,i)=>setTimeout(()=>tone(f,.15,'sawtooth',.14),i*90));}, turn:()=>{tone(300,.04,'sine',.06);} };
let state='ready', snake=[], dir={x:1,y:0}, nextDir={x:1,y:0}, food=null, score=0, speed=8, tick=0, frame=0, overT=0, shake=0, turbo=40, portals=[], obstacles=[];
function reset(){
 snake=[{x:5,y:10},{x:4,y:10},{x:3,y:10}]; dir={x:1,y:0}; nextDir={x:1,y:0}; score=0; speed=8; tick=0; turbo=40; portals=[]; obstacles=[]; spawnFood();
 for(let i=0;i<3;i++) obstacles.push({x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)});
 scEl.textContent='0'; lnEl.textContent='3';
}
function spawnFood(){
 let tries=0; while(tries<100){
  let fx=Math.floor(Math.random()*COLS), fy=Math.floor(Math.random()*ROWS);
  if(!snake.some(s=>s.x===fx&&s.y===fy)&&!obstacles.some(o=>o.x===fx&&o.y===fy)){ let r=Math.random(); if(r<0.08) food={x:fx,y:fy,t:'gem'}; else if(r<0.15) food={x:fx,y:fy,t:'portal'}; else food={x:fx,y:fy,t:'apple'}; break; }
  tries++;
 }
}
function update(){
 frame++; if(shake>0)shake*=0.88;
 if(state!=='play') return;
 let curSpeed= turbo>0 && keys.turbo? speed*0.55 : speed;
 tick+= curSpeed; if(tick<10) return; tick=0;
 dir=nextDir;
 let head={x:snake[0].x+dir.x, y:snake[0].y+dir.y};
 // wrap or wall? classic walls = die
 if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){ die(); return; }
 if(snake.some(s=>s.x===head.x&&s.y===head.y)){ die(); return; }
 if(obstacles.some(o=>o.x===head.x&&o.y===head.y)){ die(); return; }
 snake.unshift(head);
 if(food && head.x===food.x&&head.y===food.y){
  if(food.t==='apple'){ score+=10; turbo=Math.min(100,turbo+8); SFX.eat(); speed=Math.min(16,speed+0.18); }
  if(food.t==='gem'){ score+=30; turbo=Math.min(100,turbo+20); SFX.big(); }
  if(food.t==='portal'){
   portals.push({x:food.x,y:food.y}); if(portals.length>2) portals.shift();
   if(portals.length===2){ let other= portals[0].x===food.x&&portals[0].y===food.y? portals[1]:portals[0]; head.x=other.x; head.y=other.y; snake[0]=head; }
   score+=15; SFX.big();
  }
  spawnFood();
 }else{
  snake.pop();
 }
 scEl.textContent=score; lnEl.textContent=snake.length;
 if(turbo>0&&keys.turbo) turbo-=0.9;
}
function die(){ state='dead'; overT=performance.now(); shake=10; SFX.die(); if(score>BEST){BEST=score; try{localStorage.setItem('snake_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} }
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle='#0a1410'; x.fillRect(0,0,W,H);
 // grid
 x.strokeStyle='rgba(168,255,96,0.06)'; x.lineWidth=1;
 for(let i=0;i<=COLS;i++){ x.beginPath(); x.moveTo(i*CELL,0); x.lineTo(i*CELL,H); x.stroke(); }
 for(let i=0;i<=ROWS;i++){ x.beginPath(); x.moveTo(0,i*CELL); x.lineTo(W,i*CELL); x.stroke(); }
 // obstacles
 x.fillStyle='#3a4a3a'; obstacles.forEach(o=>{ x.fillRect(o.x*CELL+2,o.y*CELL+2,CELL-4,CELL-4); x.fillStyle='#5a6a5a'; x.fillRect(o.x*CELL+5,o.y*CELL+5,CELL-10,3); x.fillStyle='#3a4a3a'; });
 // portals
 portals.forEach(p=>{ x.shadowColor='#9a7aff'; x.shadowBlur=12; x.fillStyle='#9a7aff'; x.beginPath(); x.arc(p.x*CELL+CELL/2,p.y*CELL+CELL/2,CELL*0.42,0,7); x.fill(); x.shadowBlur=0; x.fillStyle='#fff'; x.beginPath(); x.arc(p.x*CELL+CELL/2,p.y*CELL+CELL/2,CELL*0.18,0,7); x.fill(); });
 // food
 if(food){
  let fx=food.x*CELL+CELL/2, fy=food.y*CELL+CELL/2;
  if(food.t==='apple'){ x.shadowColor='#ff5a5a'; x.shadowBlur=10; x.fillStyle='#ff3b3b'; x.beginPath(); x.arc(fx,fy,CELL*0.32,0,7); x.fill(); x.shadowBlur=0; x.fillStyle='#2a8a0a'; x.fillRect(fx-1,fy-CELL*0.32,2,6); }
  if(food.t==='gem'){ x.shadowColor='#58c7ff'; x.shadowBlur=14; x.fillStyle='#58c7ff'; x.beginPath(); x.moveTo(fx,fy-CELL*0.36); x.lineTo(fx+CELL*0.3,fy); x.lineTo(fx,fy+CELL*0.36); x.lineTo(fx-CELL*0.3,fy); x.closePath(); x.fill(); x.shadowBlur=0; }
  if(food.t==='portal'){ x.shadowColor='#ffd75e'; x.shadowBlur=12; x.fillStyle='#ffd75e'; x.beginPath(); x.arc(fx,fy,CELL*0.3,0,7); x.fill(); x.shadowBlur=0; x.fillStyle='#111'; x.font='900 '+(CELL*0.5)+'px Arial'; x.textAlign='center'; x.fillText('🌀',fx,fy+4); x.textAlign='left'; }
 }
 // snake
 snake.forEach((s,i)=>{
  let cx=s.x*CELL, cy=s.y*CELL;
  if(i===0){ x.fillStyle='#a8ff60'; x.shadowColor='#a8ff60'; x.shadowBlur=12; x.fillRect(cx+1,cy+1,CELL-2,CELL-2); x.shadowBlur=0; x.fillStyle='#111'; x.fillRect(cx+CELL*0.65,cy+4,4,4); x.fillRect(cx+CELL*0.65,cy+CELL-8,4,4); }
  else{ x.fillStyle= i%2===0?'#7ad03a':'#5ab00a'; x.fillRect(cx+2,cy+2,CELL-4,CELL-4); }
 });
 // turbo bar
 x.fillStyle='rgba(0,0,0,0.5)'; x.fillRect(6,H-12,W-12,8); x.fillStyle=turbo>20?'#a8ff60':'#ff5a5a'; x.fillRect(6,H-12,(W-12)*turbo/100,8);
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.6)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#d0ff9a'); g.addColorStop(1,'#5ab00a'); x.fillStyle=g; x.font='900 32px Arial Black'; x.fillText('SNAKE',W/2,H/2-30);
  x.font='700 10px Arial'; x.fillStyle='#8ab88a'; x.fillText('CLASSIC • PORTALS 🌀 • GEMS 💎 • TURBO',W/2,H/2-8);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST,W/2,H/2+12);}
  x.font='900 13px Arial'; x.fillStyle='rgba(168,255,96,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO SLITHER',W/2,H/2+38); x.textAlign='left';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.62)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(20,30,20,0.92)'; x.strokeStyle='rgba(168,255,96,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-60,328,120,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle='#ff6a6a'; x.fillText('BITTEN!',W/2,H/2-28); x.font='700 12px Arial'; x.fillStyle='#fff'; x.fillText('SCORE '+score+' • LEN '+snake.length,W/2,H/2-4);
  if(score>=BEST && score>0){x.fillStyle='#ffd75e'; x.font='900 13px Arial'; x.fillText('★ NEW BEST ★',W/2,H/2+16);} else {x.fillStyle='#8ab88a'; x.fillText('BEST: '+BEST,W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(255,255,255,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to retry',W/2,H/2+38); x.textAlign='left';
 }
}
let keys={turbo:false};
function setDir(nx,ny){
 ac();
 if(state==='ready'){ state='play'; reset(); }
 if(state==='dead'&&performance.now()-overT>500){ state='play'; reset(); return; }
 if(dir.x===-nx&&dir.y===-ny) return;
 nextDir={x:nx,y:ny}; SFX.turn();
}
document.getElementById('upB').addEventListener('pointerdown',e=>{e.preventDefault(); setDir(0,-1);});
document.getElementById('leftB').addEventListener('pointerdown',e=>{e.preventDefault(); setDir(-1,0);});
document.getElementById('rightB').addEventListener('pointerdown',e=>{e.preventDefault(); setDir(1,0);});
document.getElementById('downB').addEventListener('pointerdown',e=>{e.preventDefault(); setDir(0,1);});
document.getElementById('turboB').addEventListener('pointerdown',e=>{e.preventDefault(); keys.turbo=true;});
document.getElementById('turboB').addEventListener('pointerup',()=>keys.turbo=false);
document.getElementById('turboB').addEventListener('pointerleave',()=>keys.turbo=false);
let startX=0,startY=0;
cv.addEventListener('pointerdown',e=>{
 ac(); let r=cv.getBoundingClientRect(); startX=(e.clientX-r.left)/r.width*W; startY=(e.clientY-r.top)/r.height*H;
 if(state!=='play'){ setDir(1,0); return; }
});
cv.addEventListener('pointerup',e=>{
 let r=cv.getBoundingClientRect(); let endX=(e.clientX-r.left)/r.width*W, endY=(e.clientY-r.top)/r.height*H;
 let dx=endX-startX, dy=endY-startY;
 if(Math.abs(dx)>Math.abs(dy)){ if(dx>12) setDir(1,0); else if(dx<-12) setDir(-1,0); }
 else{ if(dy>12) setDir(0,1); else if(dy<-12) setDir(0,-1); }
});
document.addEventListener('keydown',e=>{
 if(e.code==='ArrowUp'||e.code==='KeyW') setDir(0,-1);
 if(e.code==='ArrowDown'||e.code==='KeyS') setDir(0,1);
 if(e.code==='ArrowLeft'||e.code==='KeyA') setDir(-1,0);
 if(e.code==='ArrowRight'||e.code==='KeyD') setDir(1,0);
 if(e.code==='Space') keys.turbo=true;
});
document.addEventListener('keyup',e=>{ if(e.code==='Space') keys.turbo=false; });
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('snake_mute',MUTED?'1':'0')}catch(e2){}});
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