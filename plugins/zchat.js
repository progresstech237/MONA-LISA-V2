const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/ai/zchat-agent';
const SESSION_FILE = './data/zchat-sessions.json';

if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
const load = () => { try { if (fs.existsSync(SESSION_FILE)) return JSON.parse(fs.readFileSync(SESSION_FILE,'utf8')); } catch {} return {}; };
const save = s => { try { fs.writeFileSync(SESSION_FILE, JSON.stringify(s,null,2)); } catch {} };
let sessions = load();

const getThumb = () => { try { for (const p of ['./media/menu1.png','./media/menu2.png']) if (fs.existsSync(p)) return fs.readFileSync(p); } catch {} return null; };

cmd({
  pattern: "zchat",
  alias: ["zai", "z-chat", "zagent"],
  react: "🤖",
  desc: "ZChat AI - scrapes fresh creds every new session",
  category: "progresstech ai",
  use: ".zchat hello |.zchat clear",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = q || "";
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
      try { const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson); if (p.id) rawQ = p.id.replace(prefix,"").trim(); } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
      rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z-]+\\s*`,'i'), '').trim();

    const ctx = {
      forwardingScore: 999, isForwarded: true,
      forwardedNewsletterMessageInfo: { newsletterJid: NEWSLETTER_JID, serverMessageId: 1, newsletterName: '🥷TECH TOY🧑‍💻™ ✓' }
    };
    const userKey = m.sender;

    if (['clear','reset','new'].includes(rawQ.toLowerCase())) {
      delete sessions[userKey]; save(sessions);
      return reply(`*✅ ZChat session cleared*\nNext chat = fresh credentials scraped from live site.\n\n${BRAND}`);
    }

    if (!rawQ || ['help','menu'].includes(rawQ.toLowerCase())) {
      let thumb = null; try { const { prepareWAMessageMedia } = require('@whiskeysockets/baileys'); const tb = getThumb(); if (tb) { const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer }); thumb = media.imageMessage; } } catch {}

      const menu = `┏━━〔 🤖 ZChat Agent 〕━━┓
┃ ZChat AI - auto fresh creds
┃ per new session
┃ ${sessions[userKey]? '✅ Active' : '🆕 No session'}
┃
┃ ${prefix}zchat who are you?
┃ ${prefix}zchat write poem about Mona Lisa
┃ ${prefix}zchat clear - fresh creds
┗━━━━━━━━━━━━━━┛
`;
      const buttons = [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "💬 Hello", id: `${prefix}zchat hello, introduce yourself` }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📝 Poem", id: `${prefix}zchat write romantic poem about Mona Lisa afro girl` }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🔄 New Session", id: `${prefix}zchat clear` }) },
        { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 Channel", url: CHANNEL_LINK }) }
      ];
      return await conn.relayMessage(from, {
        interactiveMessage: {
          header: { title: "🤖 ZChat Agent", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
          body: { text: menu }, footer: { text: BRAND }, nativeFlowMessage: { buttons }
        }, contextInfo: ctx
      }, {});
    }

    await conn.sendMessage(from, { react: { text: "🤖", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    if (!sessions[userKey]) sessions[userKey] = { id: `zchat_${Date.now()}`, history: [] };
    const sessionId = sessions[userKey].id;

    let answer = "";
    try {
      const { data } = await axios.post(API, {
        prompt: rawQ, message: rawQ, text: rawQ, query: rawQ,
        sessionId, session_id: sessionId,
        history: sessions[userKey].history
      }, { timeout: 60000, headers: { 'Content-Type': 'application/json' } });
      answer = data.data?.result || data.data?.response || data.data?.message || data.result || data.response || data.answer || data.message || "";
      if (!answer && typeof data.data === 'string') answer = data.data;
    } catch (e) {
      try {
        const { data } = await axios.get(`${API}?prompt=${encodeURIComponent(rawQ)}&sessionId=${sessionId}`, { timeout: 60000 });
        answer = data.data?.result || data.result || data.data?.response || data.response || "";
        if (!answer && typeof data.data === 'string') answer = data.data;
      } catch {}
    }

    if (!answer) throw new Error('No response');

    sessions[userKey].history.push({ role: "user", content: rawQ });
    sessions[userKey].history.push({ role: "assistant", content: answer.slice(0,1000) });
    if (sessions[userKey].history.length > 20) sessions[userKey].history = sessions[userKey].history.slice(-20);
    save(sessions);

    if (answer.length > 4000) {
      const parts = answer.match(/.{1,3500}/gs);
      for (let i=0;i<parts.length;i++) {
        await conn.sendMessage(from, { text: `${i===0?`*🤖 ZChat:*\n\n`:''}${parts[i]}${i===parts.length-1?`\n\n_${BRAND}_`:''}`, contextInfo: ctx }, { quoted: i===0?mek:undefined });
      }
    } else {
      await conn.sendMessage(from, { text: `*🤖 ZChat:*\n\n${answer}\n\n_${BRAND}_\n${prefix}zchat clear for fresh creds`, contextInfo: ctx }, { quoted: mek });
    }
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    reply(`*❌ ZChat Failed*\n${e.message}\nTry ${'.zchat clear'}`);
  }
});