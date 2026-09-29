const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/ai/Claude-pro';

let sessions = {};

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png','./media/menu3.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

async function getImageBase64(mek, conn) {
    try {
        const qMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = qMsg?.imageMessage || mek.message?.imageMessage;
        if (!imgMsg) return null;
        const buffer = await conn.downloadMediaMessage({ message: { imageMessage: imgMsg } });
        return buffer.toString('base64');
    } catch { return null; }
}

cmd({
  pattern: "claude",
  alias: ["claudepro", "deepai", "claude-pro", "vision"],
  react: "🧠",
  desc: "Claude Pro - 15+ models, vision, image gen, edit",
  category: "progresstech ai",
  use: ".claude hello | .claude gen image cat | reply image .claude what is this? | .claude edit make background sunset",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = q || "";
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson);
            if (p.id) rawQ = p.id.replace(prefix,"").trim();
        } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z-]+\\s*`, 'i'), '').trim();

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: NEWSLETTER_JID,
            serverMessageId: 1,
            newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
        }
    };

    if (rawQ.toLowerCase() === 'clear' || rawQ.toLowerCase() === 'new' || rawQ.toLowerCase() === 'reset') {
        delete sessions[m.sender];
        return reply(`*✅ Claude session cleared*\n${BRAND}`);
    }

    if (!rawQ) {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) {
                const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer });
                thumb = media.imageMessage;
            }
        } catch {}

        const menu = `┏━━〔 🧠 Claude-Pro 〕━━┓
┃ Full DeepAI - 15+ Models
┃ chat, vision, image gen, edit
┃
┃ *Usage:*
┃ ${prefix}claude <question>
┃ ${prefix}claude gen image; a cyberpunk city
┃ Reply image + ${prefix}claude what is this?
┃ Reply image + ${prefix}claude edit; make it sunset
┃ ${prefix}claude clear - reset memory
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "💬 Chat", id: `${prefix}claude Hello, explain yourself` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👁️ Vision Chat", id: `${prefix}claude what do you see?` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎨 Generate Image", id: `${prefix}claude gen image; Mona Lisa afro girl, album art` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🧠 Claude Pro • 15+ Models", hasMediaAttachment: !!thumb, ...(thumb ? { imageMessage: thumb } : {}) },
                body: { text: menu },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🧠", key: mek.key } });

    if (!sessions[m.sender]) sessions[m.sender] = { id: `claude_${Date.now()}`, history: [] };
    const sessionId = sessions[m.sender].id;

    // Detect action
    let action = "chat";
    let prompt = rawQ;
    const lower = rawQ.toLowerCase();

    if (lower.startsWith('gen image') || lower.startsWith('generate image') || lower.includes('text-to-image')) {
        action = "generate-image";
        prompt = rawQ.replace(/gen image|generate image|text-to-image/gi,'').replace(/^;|:|-/,'').trim();
    } else if (lower.startsWith('edit')) {
        action = "edit-image";
        prompt = rawQ.replace(/edit/gi,'').replace(/^;|:|-/,'').trim();
    } else if (lower.includes('vision') || await getImageBase64(mek, conn)) {
        action = "vision-chat";
    }

    const imageBase64 = await getImageBase64(mek, conn);

    // Build payload
    const payload = {
        action: action,
        prompt: prompt,
        message: prompt,
        text: prompt,
        query: prompt,
        sessionId: sessionId,
        session_id: sessionId,
        model: "claude-3.5-sonnet",
        mode: action
    };

    if (imageBase64) {
        payload.image = `data:image/jpeg;base64,${imageBase64}`;
        payload.image_base64 = imageBase64;
        payload.base64 = imageBase64;
        payload.vision_image = payload.image;
    }

    // POST - Working as per screenshot
    const { data } = await axios.post(API, payload, {
        timeout: 120000,
        headers: { 'Content-Type': 'application/json' }
    });

    // Parse response
    const resultUrl = data.data?.url || data.data?.image_url || data.image_url || data.url || data.data?.result_url;
    const resultBase64 = data.data?.base64 || data.data?.image_base64;
    let textAnswer = data.data?.result || data.data?.answer || data.data?.response || data.result || data.answer || data.response || data.message;

    if (action === 'generate-image' || action === 'edit-image') {
        if (resultBase64) {
            const buf = Buffer.from(resultBase64.replace(/^data:image\/\w+;base64,/,''), 'base64');
            await conn.sendMessage(from, { image: buf, caption: `*🎨 Claude Pro - ${action}*\n${prompt}\n${BRAND}`, contextInfo: ctx }, { quoted: mek });
        } else if (resultUrl) {
            await conn.sendMessage(from, { image: { url: resultUrl }, caption: `*🎨 Claude Pro - ${action}*\n${prompt}\n${BRAND}`, contextInfo: ctx }, { quoted: mek });
        } else if (textAnswer && (textAnswer.includes('http') || textAnswer.length < 500)) {
            // Sometimes returns URL as text
            if (textAnswer.startsWith('http')) {
                await conn.sendMessage(from, { image: { url: textAnswer }, caption: `*🎨 ${action}*\n${prompt}\n${BRAND}`, contextInfo: ctx }, { quoted: mek });
            } else {
                await conn.sendMessage(from, { text: `*🧠 Claude Pro*\n\n${textAnswer}\n\n${BRAND}`, contextInfo: ctx }, { quoted: mek });
            }
        } else {
            throw new Error('No image returned');
        }
    } else {
        // Chat / vision
        if (typeof textAnswer !== 'string') textAnswer = JSON.stringify(textAnswer).slice(0,3500);
        if (!textAnswer) textAnswer = resultUrl ? resultUrl : "No response";

        sessions[m.sender].history.push({ role: "user", content: prompt });
        sessions[m.sender].history.push({ role: "assistant", content: textAnswer });
        if (sessions[m.sender].history.length > 30) sessions[m.sender].history = sessions[m.sender].history.slice(-30);

        await conn.sendMessage(from, { text: `*🧠 Claude Pro*\n\n${textAnswer}\n\n_${BRAND}_\n_${CHANNEL_LINK}_`, contextInfo: ctx }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Claude Pro Error:', e.response?.data || e.message);
    reply(`*❌ Claude Pro Failed*\n${e.response?.data?.message || e.message}\n\nTry: ${prefix}claude hello`);
  }
});