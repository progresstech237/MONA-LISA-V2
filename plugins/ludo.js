const { cmd } = require('../redx');
const crypto = require('crypto');

cmd({
  pattern: "ludo",
  alias: ["ludogame","parcheesi"],
  react: "🎲",
  desc: "Pro Ludo - 4 Player Premium Board Game",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    global.ludoLimit = global.ludoLimit || {};
    const now = Date.now();
    if (global.ludoLimit[from] && now - global.ludoLimit[from] < 15000) {
      return reply(`⏳ Wait ${Math.ceil((15000 - (now - global.ludoLimit[from]))/1000)}s before new Ludo.`);
    }
    global.ludoLimit[from] = now;

    const html = `
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
body{background:radial-gradient(circle at 20% 10%,#1e3a8a,#0a0e1f 70%);padding:6px;color:#fff;overflow:hidden}
#app{max-width:440px;margin:0 auto}
.top{display:flex;justify-content:space-between;align-items:center;padding:6px 2px}
.logo{font:900 17px 'Arial Black';letter-spacing:1px;color:#ffd700;text-shadow:0 0 12px #ffd70088}
.logo small{display:block;font:700 7px Arial;letter-spacing:3px;color:#8aa6d0}
.pills{display:flex;gap:6px}
.pill{padding:4px 10px;border-radius:20px;font:800 11px Arial;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35)}
.pill.active{border-color:#ffd700;color:#ffd700;box-shadow:0 0 10px #ffd70044}
.boardWrap{position:relative;border:2px solid rgba(255,215,0,.35);border-radius:16px;overflow:hidden;background:#0e142a;box-shadow:0 0 20px rgba(0,0,0,.6),0 0 20px rgba(255,215,0,.15);aspect-ratio:1/1}
canvas{width:100%;height:100%;display:block;touch-action:none}
.controls{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px}
.btn{height:52px;border-radius:14px;border:2px solid rgba(255,255,255,.18);font:900 13px 'Arial Black';color:#fff;cursor:pointer;touch-action:none;box-shadow:0 4px 0 rgba(0,0,0,.5)}
.btn:active{transform:translateY(3px);box-shadow:none}
#rollBtn{background:linear-gradient(#ffd75e,#e09406 60%,#7a5205);color:#3a2805;font-size:16px}
#playersBtn{background:linear-gradient(#58c7ff,#1f7fd6 60%,#0a3a6e)}
.diceInfo{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:6px 10px}
.dice{width:36px;height:36px;background:#fff;border-radius:8px;display:grid;place-items:center;font:900 18px Arial;color:#111;box-shadow:0 2px 0 rgba(0,0,0,.3)}
.turn{font:800 11px Arial;color:#8aa6d0}
.turn b{color:#fff}
.hint{text-align:center;font:600 9px Arial;color:#8aa6d0;margin-top:6px}
.modal{position:absolute;inset:0;background:rgba(4,10,26,.78);backdrop-filter:blur(6px);display:grid;place-items:center;z-index:10}
.card{background:linear-gradient(165deg,#1a2a5a,#0f1a38);border:2px solid rgba(255,215,0,.3);border-radius:18px;padding:16px;width:84%;text-align:center;box-shadow:0 0 30px rgba(0,0,0,.7)}
.card h2{font:900 22px 'Arial Black';color:#ffd700;margin-bottom:6px}
.card p{font:600 11px Arial;color:#8aa6d0;margin-bottom:12px}
.row{display:flex;gap:8px;margin:8px 0}
.opt{flex:1;padding:10px;border-radius:12px;border:2px solid rgba(255,255,255,.15);background:rgba(0,0,0,.3);font:800 12px Arial;color:#fff;cursor:pointer}
.opt.sel{border-color:#ffd700;color:#ffd700;background:rgba(255,215,0,.12)}
.startBtn{width:100%;height:44px;border-radius:12px;border:none;background:linear-gradient(#ffd75e,#e09406);font:900 14px 'Arial Black';color:#3a2805;cursor:pointer;margin-top:8px}
</style>
<div id="app">
<div class="top"><div class="logo">🎲 LUDO KING<small>PREMIUM EDITION</small></div><div class="pills"><div class="pill active" id="pR">🔴 0/4</div><div class="pill" id="pG">🟢 0/4</div><div class="pill" id="pY">🟡 0/4</div><div class="pill" id="pB">🔵 0/4</div></div></div>
<div class="boardWrap"><canvas id="cv" width="600" height="600"></canvas>
<div class="modal" id="modal"><div class="card"><h2>🎲 LUDO PRO</h2><p>Select players & mode. Roll 6 to enter. Capture on safe spots disabled.</p>
<div class="row"><div class="opt sel" data-p="2">2P</div><div class="opt" data-p="3">3P</div><div class="opt" data-p="4">4P</div></div>
<div class="row"><div class="opt sel" data-m="bot">🤖 VS BOT</div><div class="opt" data-m="local">👥 LOCAL</div></div>
<button class="startBtn" id="startBtn">START GAME</button></div></div>
</div>
<div class="controls"><button class="btn" id="rollBtn">🎲 ROLL</button><div class="diceInfo"><div class="dice" id="dice">6</div><div class="turn" id="turn">Turn: <b style="color:#ff5a5a">RED</b><br><span id="msg">Roll 6 to enter!</span></div></div><button class="btn" id="playersBtn">👥 2P</button></div>
<div class="hint">Tap token to move • Safe ★ spots • 6 = extra turn • Exact roll to home</div>
</div>
<script>
(function(){
const cv=document.getElementById('cv'), x=cv.getContext('2d'), S=600, CELL=S/15;
const colors={R:'#ff3b3b',G:'#2ecc71',Y:'#f1c40f',B:'#3498db'};
const colorOrder=['R','G','Y','B'];
const safeIdx=[0,8,13,21,26,34,39,47];
let players=2, mode='bot', turn=0, dice=6, diceRolled=false, gameOn=false, moving=false, winner=null;
let tokens={};
let track=[], homeTrack={};
function buildBoard(){
 track=[
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
 ];
 homeTrack={
  R:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  G:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  Y:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  B:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]]
 };
}
function initTokens(){
 tokens={};
 colorOrder.forEach(c=>{
  tokens[c]=[];
  for(let i=0;i<4;i++) tokens[c].push({id:i, pos:-1, homeIdx:-1, finished:false});
 });
}
function draw(){
 x.clearRect(0,0,S,S);
 x.fillStyle='#e9e1c8'; x.fillRect(0,0,S,S);
 // homes
 [[0,0,'R'],[9,0,'G'],[9,9,'Y'],[0,9,'B']].forEach(([r,c,col])=>{
  x.fillStyle=colors[col]; x.fillRect(c*CELL, r*CELL, 6*CELL, 6*CELL);
  x.fillStyle='rgba(255,255,255,.85)'; x.fillRect(c*CELL+CELL, r*CELL+CELL, 4*CELL, 4*CELL);
  x.fillStyle=colors[col]; x.beginPath();
  [[1,1],[1,3],[3,1],[3,3]].forEach(([dr,dc])=>{
   x.moveTo((c+dc)*CELL+ CELL*0.5, (r+dr)*CELL+ CELL*0.5);
   x.arc((c+dc)*CELL+ CELL*0.5, (r+dr)*CELL+ CELL*0.5, CELL*0.45, 0, 7);
  }); x.fill();
 });
 // center
 x.fillStyle='#0e142a'; x.fillRect(6*CELL,6*CELL,3*CELL,3*CELL);
 x.fillStyle='#ffd700'; x.beginPath(); x.moveTo(7.5*CELL,6*CELL); x.lineTo(9*CELL,7.5*CELL); x.lineTo(7.5*CELL,9*CELL); x.lineTo(6*CELL,7.5*CELL); x.closePath(); x.fill();
 // path cells
 for(let r=0;r<15;r++) for(let c=0;c<15;c++){
  if(r>=6&&r<=8 || c>=6&&c<=8){
   if(!((r>=6&&r<=8)&&(c>=6&&c<=8)) || (r===6||r===8||c===6||c===8)){
    x.strokeStyle='rgba(0,0,0,.15)'; x.lineWidth=1; x.strokeRect(c*CELL, r*CELL, CELL, CELL);
   }
  }
 }
 // safe stars
 safeIdx.forEach(i=>{
  let [r,c]=track[i];
  x.fillStyle='#fff9c4'; x.fillRect(c*CELL+2, r*CELL+2, CELL-4, CELL-4);
  x.fillStyle='#ff9800'; x.font='bold '+ (CELL*0.5) +'px Arial'; x.textAlign='center'; x.fillText('★', c*CELL+CELL/2, r*CELL+CELL*0.7);
 });
 // home arrows
 colorOrder.forEach(col=>{
  homeTrack[col].forEach(([r,c],idx)=>{
   x.fillStyle=colors[col]+'55'; x.fillRect(c*CELL+3, r*CELL+3, CELL-6, CELL-6);
   if(idx===5){ x.fillStyle=colors[col]; x.fillRect(c*CELL+6, r*CELL+6, CELL-12, CELL-12); }
  });
 });
 // tokens
 colorOrder.forEach(col=>{
  tokens[col].forEach(t=>{
   if(t.finished) return;
   let pos=null;
   if(t.pos===-1){
    let base = col==='R'?[0,0]:col==='G'?[9,0]:col==='Y'?[9,9]:[0,9];
    let off = [[1,1],[1,3],[3,1],[3,3]][t.id];
    pos=[base[0]+off[0], base[1]+off[1]];
   }else if(t.pos>=100){
    let hi=t.pos-100;
    pos=homeTrack[col][hi];
   }else{
    pos=track[t.pos];
   }
   let [r,c]=pos;
   let cx=c*CELL+CELL/2, cy=r*CELL+CELL/2;
   // shadow
   x.fillStyle='rgba(0,0,0,.25)'; x.beginPath(); x.arc(cx+2, cy+3, CELL*0.38,0,7); x.fill();
   // selectable glow
   let curCol=colorOrder[turn];
   if(gameOn && col===curCol && canMove(t) &&!moving){
    x.shadowColor=colors[col]; x.shadowBlur=14;
   }
   x.fillStyle=colors[col]; x.beginPath(); x.arc(cx,cy,CELL*0.36,0,7); x.fill(); x.shadowBlur=0;
   x.fillStyle='#fff'; x.beginPath(); x.arc(cx,cy,CELL*0.26,0,7); x.fill();
   x.fillStyle=colors[col]; x.beginPath(); x.arc(cx,cy,CELL*0.18,0,7); x.fill();
   if(t.pos>=100){ x.fillStyle='#111'; x.font='800 '+(CELL*0.3)+'px Arial'; x.textAlign='center'; x.fillText('H',cx,cy+4); }
  });
 });
 x.textAlign='left';
}
function startEntry(col){ return {R:0,G:13,Y:26,B:39}[col]; }
function canMove(t){
 if(!diceRolled) return false;
 let cur=colorOrder[turn];
 if(tokens[cur].indexOf(t)===-1) return false;
 if(t.finished) return false;
 if(t.pos===-1) return dice===6;
 if(t.pos>=100){
  let need=5-(t.pos-100);
  return dice<=need+1;
 }
 return true;
}
function moveToken(col, idx){
 let t=tokens[col][idx];
 if(t.pos===-1){
  t.pos=startEntry(col); t.homeIdx=-1;
 }else if(t.pos>=100){
  let curHome=t.pos-100;
  if(curHome+dice===6){ t.finished=true; t.pos=200+curHome; }
  else if(curHome+dice<6){ t.pos=100+curHome+dice; }
  else return false;
 }else{
  let steps=dice;
  let cur=t.pos;
  for(let s=0;s<steps;s++){
   cur=(cur+1)%52;
   // enter home?
   let entry={R:51,G:12,Y:25,B:38}[col];
   if(cur=== (entry+1)%52){
    if(t.homeIdx>=0 || steps-(s+1) >=0){
     let homeSteps = steps-(s+1);
     if(homeSteps<=5){
      t.pos=100+homeSteps;
      t.homeIdx=homeSteps;
      checkWin(); draw(); return true;
     }
    }
   }
  }
  // if not home
  if(t.pos<100) t.pos=cur;
 }
 // capture
 let isSafe=safeIdx.includes(t.pos);
 if(!isSafe && t.pos<100){
  colorOrder.forEach(other=>{
   if(other===col) return;
   tokens[other].forEach(ot=>{
    if(ot.pos===t.pos &&!ot.finished){
     ot.pos=-1; ot.homeIdx=-1;
    }
   });
  });
 }
 checkWin(); draw(); return true;
}
function checkWin(){
 colorOrder.slice(0,players).forEach(col=>{
  if(tokens[col].every(t=>t.finished) &&!winner){ winner=col; setTimeout(()=>{ alert('🏆 '+col+' WINS!'); resetGame(); }, 200); }
 });
 updatePills();
}
function updatePills(){
 colorOrder.forEach((col,i)=>{
  let el=document.getElementById('p'+col);
  let fin=tokens[col].filter(t=>t.finished).length;
  el.textContent=(['🔴','🟢','🟡','🔵'][i])+' '+fin+'/4';
  el.classList.toggle('active', i===turn);
 });
}
function rollDice(){
 if(moving ||!gameOn) return;
 if(diceRolled) return;
 diceRolled=true;
 let anim=0, target=1+Math.floor(Math.random()*6);
 let iv=setInterval(()=>{
  dice=1+Math.floor(Math.random()*6);
  document.getElementById('dice').textContent=dice;
  anim++; if(anim>12){ clearInterval(iv); dice=target; document.getElementById('dice').textContent=dice; afterRoll(); }
 }, 60);
}
function afterRoll(){
 let curCol=colorOrder[turn];
 let movable=tokens[curCol].filter(t=>canMove(t));
 document.getElementById('msg').textContent= movable.length? 'Tap token to move' : 'No move';
 if(movable.length===0){
  setTimeout(()=>{ nextTurn(); }, 800);
 }else{
  if(mode==='bot' && turn!==0){
   setTimeout(()=>{ botMove(); }, 700);
  }
 }
}
function botMove(){
 let curCol=colorOrder[turn];
 let mov=tokens[curCol].filter((t,i)=>canMove(t));
 if(mov.length===0){ nextTurn(); return; }
 // strategy: capture > home > enter > farthest
 let bestIdx=0, bestScore=-999;
 tokens[curCol].forEach((t,i)=>{
  if(!canMove(t)) return;
  let score=0;
  if(t.pos===-1 && dice===6) score+=50;
  if(t.pos>=100) score+=100+(t.pos-100)*10;
  if(t.pos>=0 && t.pos<100){
   let np=(t.pos+dice)%52;
   // capture?
   colorOrder.forEach(oc=>{ if(oc===curCol) return; tokens[oc].forEach(ot=>{ if(ot.pos===np &&!safeIdx.includes(np)) score+=80; }); });
   score+=t.pos/52*10;
  }
  if(score>bestScore){ bestScore=score; bestIdx=i; }
 });
 moveToken(curCol,bestIdx);
 setTimeout(()=>{ if(dice!==6) nextTurn(); else { diceRolled=false; document.getElementById('msg').textContent='Extra turn! Roll again'; if(mode==='bot'&&turn!==0) setTimeout(()=>{ diceRolled=false; rollDice(); }, 600); } }, 400);
}
function nextTurn(){
 if(winner) return;
 if(dice!==6){ turn=(turn+1)%players; }
 diceRolled=false;
 let col=colorOrder[turn];
 document.getElementById('turn').innerHTML='Turn: <b style="color:'+colors[col]+'">'+col+'</b><br><span id="msg">Roll dice!</span>';
 updatePills(); draw();
 if(mode==='bot' && turn!==0 && gameOn){ setTimeout(()=>{ rollDice(); }, 600); }
}
function handleClick(e){
 if(!gameOn || moving) return;
 let rect=cv.getBoundingClientRect();
 let mx=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
 let my=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;
 let gx=mx/rect.width*15, gy=my/rect.height*15;
 let curCol=colorOrder[turn];
 if(mode==='bot' && turn!==0) return;
 tokens[curCol].forEach((t,i)=>{
  let pos=null;
  if(t.pos===-1){
   let base = curCol==='R'?[0,0]:curCol==='G'?[9,0]:curCol==='Y'?[9,9]:[0,9];
   let off = [[1,1],[1,3],[3,1],[3,3]][t.id];
   pos=[base[0]+off[0], base[1]+off[1]];
  }else if(t.pos>=100) pos=homeTrack[curCol][t.pos-100];
  else if(t.pos>=0 && t.pos<52) pos=track[t.pos];
  else return;
  if(Math.abs(pos[1]-gx)<0.8 && Math.abs(pos[0]-gy)<0.8){
   if(canMove(t)){
    moving=true;
    moveToken(curCol,i);
    moving=false;
    if(dice!==6) { setTimeout(()=>nextTurn(), 400); }
    else { diceRolled=false; document.getElementById('msg').textContent='Extra! Roll again'; }
   }
  }
 });
}
function resetGame(){ gameOn=false; document.getElementById('modal').style.display='grid'; winner=null; }
function startGame(){
 buildBoard(); initTokens();
 document.getElementById('modal').style.display='none';
 gameOn=true; turn=0; diceRolled=false; dice=6; winner=null;
 document.getElementById('dice').textContent='6';
 document.getElementById('turn').innerHTML='Turn: <b style="color:#ff3b3b">R</b><br><span id="msg">Roll 6 to enter!</span>';
 updatePills(); draw();
 if(mode==='bot' && turn!==0) rollDice();
}
buildBoard(); initTokens(); draw();
document.getElementById('rollBtn').addEventListener('click', rollDice);
document.getElementById('rollBtn').addEventListener('touchstart', (e)=>{e.preventDefault(); rollDice();});
cv.addEventListener('click', handleClick);
cv.addEventListener('touchstart', (e)=>{ handleClick(e); }, {passive:false});
document.getElementById('startBtn').addEventListener('click', startGame);
document.querySelectorAll('.opt[data-p]').forEach(o=>{
 o.addEventListener('click', ()=>{ document.querySelectorAll('.opt[data-p]').forEach(x=>x.classList.remove('sel')); o.classList.add('sel'); players=parseInt(o.dataset.p); document.getElementById('playersBtn').textContent='👥 '+players+'P'; });
});
document.querySelectorAll('.opt[data-m]').forEach(o=>{
 o.addEventListener('click', ()=>{ document.querySelectorAll('.opt[data-m]').forEach(x=>x.classList.remove('sel')); o.classList.add('sel'); mode=o.dataset.m; });
});
document.getElementById('playersBtn').addEventListener('click', ()=>{ document.getElementById('modal').style.display='grid'; });
})();
</script>`;

    const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
    const gameData = {
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
    };
    const msg = await generateWAMessageFromContent(from, gameData, {});
    await conn.relayMessage(from, msg.message, { messageId: msg.key.id });

  } catch (e) {
    console.error('[Ludo] Error:', e);
    reply(`❌ Ludo Error: ${e.message}`);
  }
});