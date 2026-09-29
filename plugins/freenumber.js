const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/Temp-number';

function extractCode(text) {
  if (!text) return null;
  let m = String(text).match(/(?:code|otp|verify)[^\d]{0,20}(\d{4,8})|\b(\d{4,8})\b/i);
  if (m) return (m[1] || m[2] || '').replace(/\D/g,'');
  let m2 = String(text).match(/\b\d{4,8}\b/);
  return m2? m2[0] : null;
}

async function fetchAPI(action, limit=20) {
  const { data } = await axios.get(API, { params: { action, limit }, timeout: 30000 });
  return data?.data || data?.result || data;
}

cmd({
  pattern: "tempnumber",
  alias: ["tnumber","tempnum","temp-number","otpnumber","fakenumber","smsotp","tempn"],
  react: "📱",
  desc: "Temp numbers + OTPs + AUTO WAIT - /api/tools/Temp-number",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *📱 TEMP-NUMBER - FULL v2 ✅* ─
│ 43k+ OTPs | Auto OTP Listener
│
├─ *📌 LIST*
│.tempnumber numbers → 10 numbers
│.tempnumber numbers 20
│.tempnumber otps → 5 recent
│.tempnumber otps 20
│
├─ *📌 CHECK SPECIFIC*
│.tempnumber check +79246787770
│.tempnumber check 79014717645
│.tempnumber otp +79246787770 → only code
│
├─ *📌 AUTO WAIT (NEW) 🔥*
│.tempnumber wait +79246787770
│ → polls every 7s for 2min until NEW OTP
│.tempnumber wait +79246787770 120 → 120 sec
│.tempnumber wait +79246787770 300 → 5 min listener
│
├─ *📌 RAW*
│.tempnumber raw numbers 2 → your SS JSON
│
╰─ API: /api/tools/Temp-number?action=...&limit=...`
      );
    }

    let args = q.trim().split(/\s+/);
    let action = args[0].toLowerCase();
    let limit = parseInt(args[1]) || 10;

    // RAW DEBUG - your exact screenshot
    if (action === 'raw') {
      let a = args[1] || 'numbers';
      let l = parseInt(args[2]) || 2;
      const { data } = await axios.get(API, { params: { action: a, limit: l }, timeout: 30000 });
      await conn.sendMessage(from, { text: `*RAW ${a} limit=${l}:*\n\`\`\`${JSON.stringify(data, null, 2).slice(0,3500)}\`\`\`` }, { quoted: mek });
      return;
    }

    // WAIT / LISTENER - AUTO POLL
    if (action === 'wait' || action === 'listen' || action === 'watch') {
      let target = args[1];
      if (!target) return reply('❌.tempnumber wait +79246787770\nEx:.tempnumber wait 79014717645 120');
      target = target.replace(/\s/g,'');
      let timeoutSec = parseInt(args[2]) || 120;
      let intervalSec = 7;

      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      await reply(`*⏳ AUTO WAIT STARTED ✅*\n\n*Number:* ${target}\n*Poll:* every ${intervalSec}s\n*Timeout:* ${timeoutSec}s\n*Total in DB:* ~43k\n\nSend OTP to this number now... I will notify when new OTP arrives.`);

      let startData = await fetchAPI('otps', 100);
      let startOtps = startData?.otps || [];
      let seen = new Set(startOtps.map(o=> `${o.number}|${o.time}|${o.message||''}`.slice(0,100)));

      let elapsed = 0;
      let found = null;

      while (elapsed < timeoutSec) {
        await new Promise(r=> setTimeout(r, intervalSec*1000));
        elapsed += intervalSec;

        try {
          let curData = await fetchAPI('otps', 100);
          let curOtps = curData?.otps || [];

          // Filter for target
          let newForTarget = curOtps.filter(o=>{
            const num = (o.number||'').replace(/[\s+()-]/g,'');
            const tgt = target.replace(/[\s+()-]/g,'');
            const key = `${o.number}|${o.time}|${o.message||''}`.slice(0,100);
            if (seen.has(key)) return false;
            return num.includes(tgt) || tgt.includes(num);
          });

          if (newForTarget.length>0) {
            found = newForTarget[0];
            break;
          }

          // Also check if any new OTP at all for this number even if seen logic fails - compare count
          let targetNow = curOtps.filter(o=>{
            const num = (o.number||'').replace(/[\s+()-]/g,'');
            const tgt = target.replace(/[\s+()-]/g,'');
            return num.includes(tgt) || tgt.includes(num);
          });

          // If count increased
          if (targetNow.length > 0) {
            let targetBefore = startOtps.filter(o=>{
              const num = (o.number||'').replace(/[\s+()-]/g,'');
              const tgt = target.replace(/[\s+()-]/g,'');
              return num.includes(tgt) || tgt.includes(num);
            });
            if (targetNow.length > targetBefore.length) {
              // find newest not in seen
              for (let o of targetNow) {
                const key = `${o.number}|${o.time}|${o.message||''}`.slice(0,100);
                if (!seen.has(key)) { found = o; break; }
              }
              if (found) break;
            }
          }

          if (elapsed % 21 === 0) {
            await conn.sendMessage(from, { text: `⏳ Still waiting ${target}... ${elapsed}s / ${timeoutSec}s` }, { quoted: mek });
          }

        } catch (e) {
          console.log('wait poll err', e.message);
        }
      }

      if (found) {
        let code = extractCode(found.message||found.text||JSON.stringify(found));
        let msg = `*🔑 NEW OTP FOUND! ✅*\n\n*Number:* ${found.number} ${found.flag||''}\n*Country:* ${found.country||''}\n*Time:* ${found.time||'now'}\n*Msg:* ${(found.message||found.text||'').slice(0,500)}\n\n`;
        if (code) msg += `*🔥 CODE: \`${code}\`*\n\n`;
        msg += `*Waited:* ${elapsed}s\n> @Omegatech-01`;
        await conn.sendMessage(from, { text: msg }, { quoted: mek });
        if (code) {
          await conn.sendMessage(from, { text: `*${code}*` }, { quoted: mek });
        }
      } else {
        await reply(`*⌛ TIMEOUT - ${target}*\nNo new OTP in ${timeoutSec}s\n\nTry:\n.tempnumber check ${target}\n.tempnumber otps 20`);
      }
      return;
    }

    // CHECK + OTP ONLY
    if (action === 'check' || action === 'otp' || action.startsWith('+') || /^\d{7,15}$/.test(action)) {
      let targetNumber = action === 'check' || action === 'otp'? args[1] : action;
      if (!targetNumber) return reply('❌.tempnumber check +79246787770');
      targetNumber = targetNumber.replace(/\s/g,'');
      let onlyCode = action === 'otp';

      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      let d = await fetchAPI('otps', 100);
      let allOtps = d?.otps || [];

      let filtered = allOtps.filter(o=>{
        const num = (o.number||'').replace(/[\s+()-]/g,'');
        const tgt = targetNumber.replace(/[\s+()-]/g,'');
        return num.includes(tgt) || tgt.includes(num);
      });

      if (filtered.length===0) return reply(`*📭 NO OTP for ${targetNumber} in last 100*\nTotal: ${d.total||43609}\n\n.tempnumber otps 20\n.tempnumber wait ${targetNumber}`);

      if (onlyCode) {
        let codes = filtered.map(o=> ({...o, code: extractCode(o.message||o.text||JSON.stringify(o))})).filter(o=>o.code);
        if (codes.length===0) return reply(`*Found ${filtered.length} msgs but no code*\n\n${filtered[0].message||JSON.stringify(filtered[0]).slice(0,500)}`);
        let msg = `*🔑 CODES for ${targetNumber} ✅*\n\n`;
        codes.slice(0,10).forEach((o,i)=>{ msg+=`${i+1}. \`${o.code}\` - ${o.time} - ${(o.message||'').slice(0,80)}\n`; });
        await conn.sendMessage(from, { text: msg }, { quoted: mek });
        await conn.sendMessage(from, { text: `*${codes[0].code}*` }, { quoted: mek });
        return;
      }

      let msg = `*📱 OTPs for ${targetNumber} ✅* (${filtered.length})\n\n`;
      filtered.slice(0,10).forEach((o,i)=>{
        let code = extractCode(o.message||o.text||JSON.stringify(o));
        msg += `${i+1}. *${o.number}* ${o.flag||''}\nTime: ${o.time}\nMsg: ${(o.message||o.text||'').slice(0,200)}\n${code?`🔑 CODE: ${code}\n`:''}\n`;
      });
      msg += `\n.tempnumber otp ${targetNumber} → codes only\n.tempnumber wait ${targetNumber} → auto listener`;
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
      return;
    }

    // NUMBERS / OTPS LIST
    if (!['numbers','otps'].includes(action)) {
      if (!isNaN(parseInt(action))) { limit = parseInt(action); action = 'numbers'; }
      else action = action==='otp'?'otps':action;
    }

    await conn.sendMessage(from, { react: { text: action==='numbers'?"📱":"🔑", key: mek.key } });

    let d = await fetchAPI(action, limit);

    if (action === 'numbers') {
      let list = d?.numbers || d?.result || d?.data || (Array.isArray(d)?d:[]) ;
      let finalList = Array.isArray(list)? list : (Array.isArray(d)? d : []);
      if (finalList.length===0) finalList = d?.numbers || [];
      if (!Array.isArray(finalList) || finalList.length===0) {
        return reply(`⚠️ Raw:\n\`\`\`${JSON.stringify(d, null,2).slice(0,2000)}\`\`\``);
      }
      let msg = `*📱 TEMP NUMBERS - ${finalList.length} ✅*\nTotal OTPs in DB: ${d.total||43609}\n\n`;
      finalList.slice(0,25).forEach((n,i)=>{
        msg+=`${i+1}. *${n.number||n.phone}* ${n.flag||''} ${n.country||''}\n +${n.countryCode||''} | ID:${(n.id||'').slice(0,8)}\n→.tempnumber check ${n.number} |.tempnumber wait ${n.number}\n\n`;
      });
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
    } else {
      let otps = d?.otps || [];
      if (!otps.length) return reply(`📭 Empty\n\`\`\`${JSON.stringify(d).slice(0,1000)}\`\`\``);
      let msg = `*🔑 RECENT OTPs - ${otps.length}/${d.total||43609} ✅*\n\n`;
      otps.forEach((o,i)=>{
        let code = extractCode(o.message||o.text||JSON.stringify(o));
        msg+=`${i+1}. *${o.number}* ${o.flag||''} ${o.country||''}\nTime: ${o.time||''}\n${o.message?`Msg: ${o.message.slice(0,150)}\n`:''}${code?`🔑 OTP: ${code}\n`:''}\n`;
      });
      msg+=`\n.tempnumber check +NUMBER\n.tempnumber wait +NUMBER`;
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
    }

  } catch (e) {
    console.error('TempNumber error', e.response?.data || e.message);
    reply(`❌ ${e.response?.data?.message || e.message}`);
  }
});
