const { cmd } = require('../redx');
const crypto = require('crypto');
cmd({
  pattern: "drift",
  alias: ["cardrift","driftking","racing"],
  react: "🏎️",
  desc: "Car Drift - Smoke & Combo",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
try{
global.driftLimit=global.driftLimit||{}; const now=Date.now();
if(global.driftLimit[from]&&now-global.driftLimit[from]<12000) return reply(`⏳ ${Math.ceil((12000-(now-global.driftLimit[from]))/1000)}s cooldown`);
global.driftLimit[from]=now;
const html=`
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(ellipse at 50% 0%,#1a2a3a,#05080e 70%);padding:5px;color:#fff;overflow:hidden}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px}
.tt{font:900 15px 'Arial Black';color:#ffd75e;text-shadow:0 0 12px #ffd75e88;letter-spacing:1px}
.tt small{display:block;font:700 6.5px Arial;letter-spacing:2px;color:#8a9ab8}
.hrs{display:flex;gap:5px;align-items:center}
.hr{background:rgba(0,0,0,.5);border:1px solid rgba(255,215,94,.3);border-radius:8px;padding:2px 8px;text-align:center;min-width:44px}
.hr i{display:block;font:700 6.5px Arial;color:#8a9ab8}
.hr b{font:900 12px 'Arial Black';color:#ffd75e}
.mbtn{width:30px;height:30px;border:1px solid rgba(255,215,94,.3);border-radius:8px;background:rgba(0,0,0,.5);color:#fff}
.gw{position:relative;border:2px solid rgba(255,215,94,.35);border-radius:14px;overflow:hidden;background:#000;box-shadow:0 0 22px rgba(255,215,94,.18);aspect-ratio:404/620}
canvas{width:100%;height:100%;display:block;touch-action:none}
.pads{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px}
.pd{height:52px;border-radius:12px;border:2px solid rgba(255,255,255,.15);font:900 11px 'Arial Black';color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.5);touch-action:none}
.pd:active{transform:translateY(3px);box-shadow:none}
#leftB{background:linear-gradient(#3a4a5a,#1a233a)}#rightB{background:linear-gradient(#3a4a5a,#1a233a)}
#gasB{background:linear-gradient(#2ecc71,#1a7a3a 60%,#0e3a1e)}
#brakeB{background:linear-gradient(#ff5a5a,#a01a1a 60%,#4a0a0a);grid-column:span 1}
#driftB{grid-column:span 3;height:42px;background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805}
.hint{text-align:center;font:600 8px Arial;color:#8a9ab8;margin-top:4px}
.bar{height:8px;background:rgba(0,0,0,.5);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.15);margin-top:4px}
</style>
<div id="app">
<div class="hdr"><div class="tt">🏎️ DRIFT KING<small>SMOKE EDITION</small></div><div class="hrs"><div class="hr"><i>SCORE</i><b id="sc">0</b></div><div class="hr"><i>BEST</i><b id="bs">0</b></div><div class="hr"><i>COMBO</i><b id="cb">x1</b></div><button class="mbtn" id="muteB">🔊</button></div></div>
<div class="gw"><canvas id="cv" width="404" height="620"></canvas></div>
<div class="bar"><div id="turboBar" style="width:30%;height:100%;background:linear-gradient(90deg,#58c7ff,#7df)"></div></div>
<div class="pads"><button class="pd" id="leftB">◀ STEER</button><button class="pd" id="gasB">⛽ GAS</button><button class="pd" id="rightB">STEER ▶</button><button class="pd" id="brakeB">🛑 BRAKE</button><button class="pd" id="driftB" style="grid-column:span 2">💨 DRIFT + TURBO</button></div>
<div class="hint">Hold GAS + steer into curves • BRAKE to initiate • DRIFT scores • Stay on track!</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), W=404, H=620, DPR=2; cv.width=W*DPR; cv.height=H*DPR;
const scEl=document.getElementById('sc'), bsEl=document.getElementById('bs'), cbEl=document.getElementById('cb'), turboBar=document.getElementById('turboBar');
let BEST=0; try{BEST=parseInt(localStorage.getItem('drift_best')||'0')||0}catch(e){} bsEl.textContent=BEST;
let AC=null, MUTED=false; try{MUTED=localStorage.getItem('drift_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){} return AC;}
function tone(f,d,t,v,at,sl){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain(); o.type=t||'square'; o.frequency.setValueAtTime(f,n); if(sl)o.frequency.exponentialRampToValueAtTime(sl,n+d); g.gain.setValueAtTime(v||.12,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n+d+.03);}catch(e){}}
function noiz(d,v,at,fc){let a=AC; if(!a||MUTED)return; try{let n=a.currentTime+(at||0),len=Math.floor(a.sampleRate*d),b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0); for(let i=0;i<len;i++)c[i]=Math.random()*2-1; let s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(); s.buffer=b; f.type='lowpass'; f.frequency.value=fc||1200; g.gain.setValueAtTime(v,n); g.gain.exponentialRampToValueAtTime(.0001,n+d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n+d+.03);}catch(e){}}
const SFX={ engine:()=>{tone(80,.12,'sawtooth',.06);}, drift:()=>{noiz(.15,.18,0,1200); tone(300,.15,'sawtooth',.1,0,500);}, turbo:()=>{tone(200,.5,'sawtooth',.2,0,900); noiz(.4,.22,0,3000);}, crash:()=>{noiz(.3,.28,0,600); tone(150,.25,'sawtooth',.2);}};
let state='ready', score=0, combo=1, comboT=0, turbo=30, speed=0, angle=0, driftAngle=0, driftScore=0, frame=0, shake=0, overT=0;
let track=[], trackOffset=0, playerX=0, smoke=[], skid=[], stars=[];
function reset(){
 score=0; combo=1; comboT=0; turbo=30; speed=2; angle=0; driftAngle=0; driftScore=0; trackOffset=0; playerX=0; track=[]; smoke=[]; skid=[]; frame=0; shake=0;
 for(let i=0;i<90;i++){ let curve=Math.sin(i*0.08)*0.9 + Math.sin(i*0.03)*1.2 + (Math.random()-0.5)*0.3; track.push({curve:curve, y:i*28}); }
 stars=[]; for(let i=0;i<60;i++) stars.push({x:Math.random()*W,y:Math.random()*H,s:0.5+Math.random()*2});
 scEl.textContent='0'; cbEl.textContent='x1';
}
reset();
let keys={l:false,r:false,gas:false,brake:false,drift:false};
function update(){
 frame++; if(shake>0)shake*=0.88; if(comboT>0)comboT--; else { combo=1; driftScore=0; cbEl.textContent='x1'; }
 if(state!=='play') return;
 // controls
 if(keys.l){ angle-=0.045+speed*0.006; playerX-=0.9+speed*0.12; if(keys.drift) playerX-=0.8; }
 if(keys.r){ angle+=0.045+speed*0.06; playerX+=0.9+speed*0.12; if(keys.drift) playerX+=0.8; }
 if(keys.gas){ speed=Math.min(9.5, speed+0.09); turbo=Math.min(100,turbo+0.12); if(frame%6===0) SFX.engine(); }
 else speed=Math.max(1.2, speed-0.04);
 if(keys.brake){ speed=Math.max(0.8, speed-0.18); }
 // drift physics
 let targetDrift= angle*2.5 + playerX*0.04;
 driftAngle += (targetDrift - driftAngle)*0.18;
 let isDrifting= Math.abs(driftAngle)>0.9 && speed>3.5;
 if(isDrifting){
  driftScore+= Math.abs(driftAngle)*speed*0.6;
  comboT=80; if(frame%8===0){ score+=Math.floor(driftScore*0.1*combo); driftScore=0; combo=Math.min(12,combo+0.015); cbEl.textContent='x'+combo.toFixed(1); }
  if(frame%2===0){ smoke.push({x:W/2+playerX*8 + (Math.random()-0.5)*8, y:H-72, vx:(Math.random()-0.5)*2.5 - driftAngle*0.6, vy:-1-Math.random()*2, life:1, s:2+Math.random()*3}); skid.push({x:W/2+playerX*8, y:trackOffset%28, curve:track[0]?track[0].curve:0, life:1}); }
  if(frame%10===0) SFX.drift();
  turbo=Math.min(100,turbo+0.25);
 } else {
  driftScore*=0.96;
 }
 // track scroll
 trackOffset+=speed*1.8;
 if(trackOffset>28){ trackOffset-=28; track.shift(); let last=track[track.length-1]; let newCurve= Math.sin(track.length*0.07+frame*0.002)*1.2 + Math.sin(track.length*0.023)*1.5 + (Math.random()-0.5)*0.6; if(Math.random()<0.08) newCurve*=2.2; track.push({curve:newCurve,y:0}); }
 // off track?
 let curCurve=track[10]?track[10].curve:0;
 let roadHalf= W*0.36;
 let off = Math.abs(playerX*8 + curCurve*28);
 if(off>roadHalf){ speed*=0.94; if(frame%6===0){ smoke.push({x:W/2+playerX*8,y:H-60,vx:(Math.random()-0.5)*3,vy:-0.5,life:1,s:3}); } if(off>roadHalf+18){ score=Math.max(0,score-2); shake=2; } }
 if(keys.drift && turbo>1 && isDrifting){ turbo-=0.6; speed=Math.min(10.5,speed+0.04); if(frame%4===0){ smoke.push({x:W/2+playerX*8,y:H-70,vx:(Math.random()-0.5)*1.5,vy:-2,life:1,s:3.5}); } }
 turboBar.style.width=turbo+'%';
 scEl.textContent=Math.floor(score);
 // particles
 for(let i=smoke.length-1;i>=0;i--){ let p=smoke[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.04; p.life-=0.02; if(p.life<=0) smoke.splice(i,1); }
 for(let i=skid.length-1;i>=0;i--){ skid[i].life-=0.003; if(skid[i].life<=0) skid.splice(i,1); }
}
function die(){ state='dead'; overT=performance.now(); shake=12; SFX.crash(); if(score>BEST){BEST=Math.floor(score); try{localStorage.setItem('drift_best',String(BEST))}catch(e){} bsEl.textContent=BEST;} }
function draw(){
 x.setTransform(DPR,0,0,DPR,0,0); if(shake>0) x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 x.fillStyle='#0a0f18'; x.fillRect(0,0,W,H);
 // stars
 x.fillStyle='#fff'; stars.forEach(s=>{ x.globalAlpha=0.3; x.fillRect(s.x, (s.y+trackOffset*0.2)%H, s.s,s.s);}); x.globalAlpha=1;
 // road perspective
 let baseY=H;
 for(let i=track.length-1;i>=0;i--){
  let seg=track[i];
  let y= H - i*18 + trackOffset*0.65;
  if(y<-20||y>H+20) continue;
  let perspective= (i/ track.length);
  let roadW= W*0.18 + perspective*W*0.62;
  let curve=0; for(let k=0;k<=i;k++) curve+=track[k].curve*0.6;
  let cx= W/2 + curve*6 - playerX*2*perspective;
  // grass
  x.fillStyle=i%2===0?'#1a3a1a':'#1e4a1e'; x.fillRect(0,y-9,W,10);
  // road
  x.fillStyle='#2a2e36'; x.fillRect(cx-roadW/2, y-9, roadW, 10);
  x.fillStyle=i%3===0?'#ffd75e':'#fff'; x.fillRect(cx-roadW/2+roadW*0.1, y-5, roadW*0.8, 2);
  // borders
  x.fillStyle='#c0392b'; x.fillRect(cx-roadW/2-6, y-9, 6, 10); x.fillRect(cx+roadW/2, y-9, 6, 10);
  // skid marks
  skid.forEach(sk=>{ if(Math.abs(sk.y - (y))<6){ x.fillStyle='rgba(0,0,0,'+(sk.life*0.5)+')'; x.fillRect(cx-roadW*0.18+sk.x*0.02, y-4, 2, 6); x.fillRect(cx+roadW*0.18+sk.x*0.02, y-4, 2, 6);} });
 }
 // smoke
 smoke.forEach(p=>{ x.globalAlpha=p.life*0.35; x.fillStyle='#9aa0a8'; x.beginPath(); x.arc(p.x,p.y,p.s* p.life,0,7); x.fill();}); x.globalAlpha=1;
 // car
 x.save(); x.translate(W/2+playerX*8, H-54); x.rotate(driftAngle*0.18 + angle*0.12);
 // shadow
 x.fillStyle='rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(0,10,16,6,0,0,7); x.fill();
 // body
 let grad=x.createLinearGradient(-14,-10,14,12); grad.addColorStop(0,'#ffd75e'); grad.addColorStop(0.5,'#ff9a3c'); grad.addColorStop(1,'#8a4a0a');
 x.fillStyle=grad; x.fillRect(-13,-12,26,22);
 x.fillStyle='#111'; x.fillRect(-12,-10,8,5); x.fillRect(4,-10,8,5); x.fillRect(-12,5,8,4); x.fillRect(4,5,8,4);
 x.fillStyle='#7df'; x.fillRect(-8,-7,16,5);
 x.fillStyle='#fff'; x.fillRect(-2,8,4,3);
 if(turbo>70){ x.fillStyle='rgba(88,199,255,'+(0.3+Math.random()*0.4)+')'; x.beginPath(); x.moveTo(-8,10); x.lineTo(0,18+Math.random()*6); x.lineTo(8,10); x.fill(); }
 x.restore();
 // combo text
 if(combo>1.5){ x.textAlign='center'; x.font='900 18px Arial Black'; x.fillStyle='#ffd75e'; x.fillText(combo.toFixed(1)+'x DRIFT!',W/2,90+Math.sin(frame*0.15)*3); x.font='800 12px Arial'; x.fillText('+'+Math.floor(driftScore)+' pts',W/2,108); x.textAlign='left'; }
 if(state==='ready'){
  x.fillStyle='rgba(0,0,0,0.6)'; x.fillRect(0,0,W,H); x.textAlign='center';
  let g=x.createLinearGradient(0,H/2-30,0,H/2+10); g.addColorStop(0,'#fff3b0'); g.addColorStop(1,'#ffd75e'); x.fillStyle=g; x.font='900 30px Arial Black'; x.fillText('DRIFT KING',W/2,H/2-36);
  x.font='700 10px Arial'; x.fillStyle='#8a9ab8'; x.fillText('HOLD GAS • STEER • DRIFT THROUGH CURVES',W/2,H/2-10);
  if(BEST>0){x.font='800 12px Arial'; x.fillStyle='#ffd75e'; x.fillText('BEST: '+BEST,W/2,H/2+10);}
  x.font='900 13px Arial'; x.fillStyle='rgba(255,255,255,'+(0.6+Math.sin(frame*0.12)*0.4)+')'; x.fillText('TAP TO START ENGINE',W/2,H/2+38); x.textAlign='left';
 }
 if(state==='dead'){
  x.fillStyle='rgba(0,0,0,0.62)'; x.fillRect(0,0,W,H); x.fillStyle='rgba(20,20,30,0.92)'; x.strokeStyle='rgba(255,215,94,0.4)'; x.lineWidth=2; x.beginPath(); x.roundRect(36,H/2-64,332,128,14); x.fill(); x.stroke();
  x.textAlign='center'; x.font='900 24px Arial Black'; x.fillStyle='#ffd75e'; x.fillText('FINISH',W/2,H/2-30); x.font='700 12px Arial'; x.fillStyle='#fff'; x.fillText('SCORE '+Math.floor(score)+' • COMBO x'+combo.toFixed(1),W/2,H/2-6);
  if(Math.floor(score)>=BEST && score>0){x.fillStyle='#ffd75e'; x.font='900 13px Arial'; x.fillText('★ NEW BEST ★',W/2,H/2+16);} else {x.fillStyle='#8a9ab8'; x.fillText('BEST: '+BEST,W/2,H/2+16);}
  x.font='700 11px Arial'; x.fillStyle='rgba(255,255,255,'+(0.5+Math.sin(frame*0.15)*0.5)+')'; x.fillText('tap to restart',W/2,H/2+38); x.textAlign='left';
 }
}
function setKey(k,v){ keys[k]=v; if(v) ac(); }
document.getElementById('leftB').addEventListener('pointerdown',e=>{e.preventDefault(); setKey('l',true);});
document.getElementById('leftB').addEventListener('pointerup',()=>setKey('l',false));
document.getElementById('leftB').addEventListener('pointerleave',()=>setKey('l',false));
document.getElementById('rightB').addEventListener('pointerdown',e=>{e.preventDefault(); setKey('r',true);});
document.getElementById('rightB').addEventListener('pointerup',()=>setKey('r',false));
document.getElementById('rightB').addEventListener('pointerleave',()=>setKey('r',false));
document.getElementById('gasB').addEventListener('pointerdown',e=>{e.preventDefault(); setKey('gas',true);});
document.getElementById('gasB').addEventListener('pointerup',()=>setKey('gas',false));
document.getElementById('brakeB').addEventListener('pointerdown',e=>{e.preventDefault(); setKey('brake',true);});
document.getElementById('brakeB').addEventListener('pointerup',()=>setKey('brake',false));
document.getElementById('driftB').addEventListener('pointerdown',e=>{e.preventDefault(); setKey('drift',true); if(turbo>20 && Math.abs(driftAngle)>1){ turbo-=18; speed=Math.min(10.8,speed+1.2); shake=4; SFX.turbo(); burstSmoke(); }});
document.getElementById('driftB').addEventListener('pointerup',()=>setKey('drift',false));
function burstSmoke(){ for(let i=0;i<8;i++) smoke.push({x:W/2+playerX*8,y:H-60,vx:(Math.random()-0.5)*3,vy:-1-Math.random()*2,life:1,s:3+Math.random()*2}); }
cv.addEventListener('pointerdown',e=>{
 ac(); if(state==='ready'){state='play'; reset(); return;} if(state==='dead'&&performance.now()-overT>600){state='play'; reset(); return;}
 let r=cv.getBoundingClientRect(); let tx=(e.clientX-r.left)/r.width*W; if(tx<W*0.35) setKey('l',true); else if(tx>W*0.65) setKey('r',true); else setKey('gas',true);
});
cv.addEventListener('pointerup',()=>{ setKey('l',false); setKey('r',false); setKey('gas',false); });
document.addEventListener('keydown',e=>{
 if(e.code==='ArrowLeft') setKey('l',true); if(e.code==='ArrowRight') setKey('r',true); if(e.code==='ArrowUp'||e.code==='KeyW') setKey('gas',true); if(e.code==='ArrowDown'||e.code==='KeyS') setKey('brake',true); if(e.code==='Space') setKey('drift',true);
});
document.addEventListener('keyup',e=>{
 if(e.code==='ArrowLeft') setKey('l',false); if(e.code==='ArrowRight') setKey('r',false); if(e.code==='ArrowUp'||e.code==='KeyW') setKey('gas',false); if(e.code==='ArrowDown'||e.code==='KeyS') setKey('brake',false); if(e.code==='Space') setKey('drift',false);
});
document.getElementById('muteB').addEventListener('pointerdown',e=>{e.preventDefault(); MUTED=!MUTED; e.target.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('drift_mute',MUTED?'1':'0')}catch(e2){}});
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
