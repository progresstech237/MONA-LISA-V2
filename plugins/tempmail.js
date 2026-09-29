const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/TempMail2';

async function callApi(params) {
  const { data } = await axios.get(API, { params, timeout: 30000 });
  return data;
}

function extractOTP(text) {
  if (!text) return null;
  const patterns = [
    /\b\d{6}\b/g,
    /\b\d{4,8}\b/g,
    /code[:\s-]*(\d{4,8})/i,
    /OTP[:\s-]*(\d{4,8})/i,
    /verification[:\s-]*(\d{4,8})/i
  ];
  for (let p of patterns) {
    let m = text.match(p);
    if (m) return m[0].replace(/\D/g,'').slice(0,8);
  }
  return null;
}

cmd({
  pattern: "tempmail2",
  alias: ["tmail2","omail","tempmailv2","temp2","tm2"],
  react: "📧",
  desc: "TempMail2 FULL - create, inbox, otp, read, delete",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *📧 TEMPMAIL2 - FULL FIX ✅* ─
│
├─ *📌 CREATE*
│.tm2 create
│.tm2 new
│
├─ *📌 INBOX*
│.tm2 inbox omail_d10aedbf1b56
│.tm2 inbox 7c32d356@uberip.com
│.tm2 messages omail_...
│
├─ *📌 AUTO OTP*
│.tm2 otp omail_d10aedbf1b56 → extracts code
│.tm2 otp 7c32d356@uberip.com
│
├─ *📌 READ SINGLE*
│.tm2 read omail_d10aedbf1b56 <messageId>
│.tm2 view <sessionId> <id>
│
├─ *📌 DELETE / DOMAINS*
│.tm2 delete omail_...
│.tm2 domains
│
╰─ API: /api/tools/TempMail2`
      );
    }

    const args = q.trim().split(/\s+/);
    const act = args[0].toLowerCase();
    const p1 = args[1];
    const p2 = args[2];

    // CREATE
    if (['create','new','gen','make'].includes(act)) {
      await conn.sendMessage(from, { react: { text: "📧", key: mek.key } });
      const data = await callApi({ action: 'create' });
      const d = data?.data || data;
      let msg = `*📧 TEMPMAIL2 CREATED ✅*\n\n`;
      msg += `*Address:* \`${d.address}\`\n`;
      msg += `*Session:* \`${d.sessionId}\`\n`;
      msg += `*Pass:* \`${d.password}\`\n`;
      msg += `*Domain:* ${d.domain}\n\n`;
      msg += `*Commands:*\n`;
      msg += `.tm2 inbox ${d.sessionId}\n`;
      msg += `.tm2 otp ${d.sessionId}\n`;
      msg += `> @Omegatech-01`;
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
      return;
    }

    // DOMAINS
    if (['domains','domain','listdomain'].includes(act)) {
      const data = await callApi({ action: 'domains' });
      return reply(`*Domains:*\n\`\`\`${JSON.stringify(data, null, 2).slice(0,2000)}\`\`\``);
    }

    // DELETE
    if (['delete','del','remove','clear'].includes(act)) {
      if (!p1) return reply('❌.tm2 delete <sessionId>');
      const data = await callApi({ action: 'delete', sessionId: p1, address: p1 });
      return reply(`*Deleted ${p1}:*\n\`\`\`${JSON.stringify(data, null, 2).slice(0,1000)}\`\`\``);
    }

    // INBOX / MESSAGES / OTP / READ / VIEW
    if (['inbox','messages','message','list','check','otp','read','view'].includes(act)) {
      if (!p1) return reply(`❌ Need sessionId\nEx:.tm2 ${act} omail_d10aedbf1b56`);

      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      let inboxData;
      // Try 6 param styles - 100% hit
      const tries = [
        { action: 'inbox', sessionId: p1 },
        { action: 'messages', sessionId: p1 },
        { action: 'inbox', address: p1 },
        { action: 'messages', address: p1 },
        { action: 'list', sessionId: p1 },
        { action: 'getMessages', sessionId: p1 },
        { sessionId: p1 },
        { address: p1 }
      ];

      for (let par of tries) {
        try {
          let res = await callApi(par);
          if (res && (res.data || res.result || Array.isArray(res))) { inboxData = res; break; }
        } catch {}
      }

      if (!inboxData) {
        return reply(`❌ No inbox API response for ${p1}\nTry:.tm2 create new`);
      }

      const d = inboxData?.data || inboxData?.result || inboxData;
      let messages = [];
      if (Array.isArray(d)) messages = d;
      else messages = d?.messages || d?.mails || d?.inbox || d?.data || [];

      // If act = read/view single message
      if (['read','view'].includes(act) && p2) {
        let single;
        const msgId = p2;
        try {
          let s1 = await callApi({ action: 'message', sessionId: p1, messageId: msgId, id: msgId });
          single = s1?.data || s1?.result || s1;
        } catch {
          try {
            let s1 = await callApi({ action: 'read', sessionId: p1, messageId: msgId });
            single = s1?.data || s1?.result || s1;
          } catch {}
        }
        // Find in list if API fails
        if (!single && messages.length>0) {
          single = messages.find(m=> (m.id==msgId || m._id==msgId || m.messageId==msgId)) || messages[parseInt(msgId)] || null;
        }
        if (!single) return reply(`❌ Message ${msgId} not found`);

        let body = single.html || single.text || single.body || single.content || JSON.stringify(single).slice(0,2000);
        let msg = `*📧 MESSAGE ${msgId} ✅*\n\n*From:* ${single.from||single.sender}\n*Subject:* ${single.subject}\n*Date:* ${single.date||single.createdAt||''}\n\n*Body:*\n${typeof body==='string'?body.slice(0,4000):JSON.stringify(body).slice(0,4000)}`;
        await conn.sendMessage(from, { text: msg }, { quoted: mek });
        const otp = extractOTP(JSON.stringify(single));
        if (otp) await conn.sendMessage(from, { text: `*🔑 OTP CODE: \`${otp}\`*` }, { quoted: mek });
        return;
      }

      if (!messages || messages.length===0) {
        return reply(`*📭 INBOX EMPTY - ${p1}*\n\nRaw:\n\`\`\`${JSON.stringify(inboxData, null,2).slice(0,1200)}\`\`\`\n\nSend mail to this address first`);
      }

      // OTP MODE - auto extract
      if (act === 'otp') {
        let found = null;
        for (let mail of messages) {
          let txt = JSON.stringify(mail) + (mail.body||'') + (mail.text||'') + (mail.subject||'');
          let code = extractOTP(txt);
          if (code) { found = { code, mail }; break; }
        }
        if (found) {
          let msg = `*🔑 OTP FOUND ✅*\n\n*Code:* \`${found.code}\`\n*From:* ${found.mail.from||found.mail.sender}\n*Subject:* ${found.mail.subject}\n*ID:* ${found.mail.id||found.mail._id||0}\n\n*Body preview:* ${(found.mail.body||found.mail.text||'').slice(0,300)}\n\n>.tm2 read ${p1} ${found.mail.id||0} for full`;
          await conn.sendMessage(from, { text: msg }, { quoted: mek });
          return;
        } else {
          return reply(`*📭 NO OTP*\nFound ${messages.length} mails but no 4-8 digit code\n\nLast mail: ${JSON.stringify(messages[0]).slice(0,800)}`);
        }
      }

      // Normal inbox list
      let out = `*📧 INBOX - ${p1} ✅*\n*Found:* ${messages.length} mails\n\n`;
      messages.slice(0,8).forEach((mail,i)=>{
        out += `*${i+1}. ID:${mail.id||mail._id||i}*\n`;
        out += `From: ${mail.from||mail.sender||'Unknown'}\n`;
        out += `Sub: ${mail.subject||'(no subject)'}\n`;
        out += `Date: ${mail.date||mail.createdAt||''}\n`;
        let preview = (mail.body||mail.text||mail.preview||'').toString().slice(0,120);
        if (preview) out += `Prev: ${preview}\n`;
        let code = extractOTP(JSON.stringify(mail));
        if (code) out += `🔑 OTP: ${code}\n`;
        out += `→.tm2 read ${p1} ${mail.id||mail._id||i}\n\n`;
      });
      if (messages.length>8) out += `+${messages.length-8} more... Use.tm2 read\n`;

      await conn.sendMessage(from, { text: out }, { quoted: mek });
      return;
    }

    return reply('❌ Unknown\nUse:.tm2 create |.tm2 inbox <sessionId> |.tm2 otp <sessionId>');

  } catch (e) {
    console.error('TM2 error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}`);
  }
});
