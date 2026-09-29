const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/ai/Qwen-image-edit';

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

async function getImageBuffer(mek, conn) {
    try {
        let msg = mek.message?.imageMessage || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        if (!msg) return null;
        const buf = await conn.downloadMediaMessage({ message: { imageMessage: msg } });
        return buf;
    } catch { return null; }
}

cmd({
  pattern: "qwenedit",
  alias: ["qwen", "qwen-image-edit", "editimg", "aiedit"],
  react: "✏️",
  desc: "Edit images using Qwen AI - add/remove, zoom, outfit extract",
  category: "progresstech ai",
  use: ".qwenedit <prompt> (reply to image) |.qwenedit add sunglasses",
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

    if ((!rawQ || rawQ.toLowerCase() === 'help' || rawQ.toLowerCase() === 'menu') &&!mek.message?.imageMessage &&!mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) {
                const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer });
                thumb = media.imageMessage;
            }
        } catch {}

        const menu = `┏━━〔 ✏️ Qwen Image Edit 〕━━┓
┃ Edit images with Qwen AI
┃ on Hugging Face
┃ Strong IP rotation - no limit
┃
┃ *Usage:*
┃ Reply to image with:
┃ ${prefix}qwenedit add sunglasses
┃ ${prefix}qwenedit remove background
┃ ${prefix}qwenedit zoom in on face
┃ ${prefix}qwenedit extract outfit only
┃ ${prefix}qwenedit change to anime style
┃ ${prefix}qwenedit make it sunset
┃
┃ *Can do:*
┃ Add/remove objects, zoom,
┃ outfit extract, style change
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🕶️ Add Sunglasses", id: `${prefix}qwenedit add black sunglasses` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👚 Extract Outfit", id: `${prefix}qwenedit extract the outfit, white background` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🌅 Sunset Effect", id: `${prefix}qwenedit change background to sunset, cinematic` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "✏️ Qwen Image Edit • Qwen AI", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    const imageBuffer = await getImageBuffer(mek, conn);
    if (!imageBuffer) {
        return reply(`*❌ Reply to an image*\nExample:\nReply to image + ${prefix}qwenedit add sunglasses to face\n\n_${BRAND}_`);
    }

    if (!rawQ) rawQ = "enhance image, improve quality, 4k";

    await conn.sendMessage(from, { react: { text: "✏️", key: mek.key } });
    reply(`*✏️ Qwen Editing...*\n*Prompt:* ${rawQ.slice(0,100)}\n\n_Wait 15-40 sec... IP auto-rotates_\n\n_${BRAND}_`);

    let editedUrl = null;

    // Try FormData with image + prompt (most HF models use this)
    try {
        const form = new FormData();
        form.append('image', imageBuffer, { filename: 'input.jpg', contentType: 'image/jpeg' });
        form.append('image_url', imageBuffer.toString('base64'));
        form.append('prompt', rawQ);
        form.append('text', rawQ);
        form.append('query', rawQ);
        form.append('instruction', rawQ);

        const { data, headers } = await axios.post(API, form, {
            timeout: 120000,
            headers: {...form.getHeaders()},
            responseType: 'arraybuffer'
        });

        const contentType = headers['content-type'] || '';

        if (contentType.includes('image')) {
            // Direct image returned
            await conn.sendMessage(from, {
                image: Buffer.from(data),
                caption: `*✅ Qwen Edited*\n*Prompt:* ${rawQ}\n\n*${BRAND}*\n${CHANNEL_LINK}`,
                contextInfo: ctx
            }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return;
        } else {
            // Try parse as JSON
            try {
                const jsonStr = Buffer.from(data).toString('utf8');
                const json = JSON.parse(jsonStr);
                editedUrl = json.data?.url || json.data?.image_url || json.url || json.image_url || json.data?.result || json.result;
                if (!editedUrl && typeof json.data === 'string' && json.data.startsWith('http')) editedUrl = json.data;
            } catch {}
        }
    } catch (e) {
        console.log('FormData failed', e.message);
    }

    // Fallback POST base64 JSON
    if (!editedUrl) {
        try {
            const { data } = await axios.post(API, {
                image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
                image_base64: imageBuffer.toString('base64'),
                prompt: rawQ,
                text: rawQ,
                instruction: rawQ,
                query: rawQ
            }, { timeout: 120000, headers: { 'Content-Type': 'application/json' } });

            editedUrl = data.data?.url || data.data?.image_url || data.data?.result || data.url || data.image_url || data.result;
            if (!editedUrl && typeof data.data === 'string' && data.data.startsWith('http')) editedUrl = data.data;
            if (!editedUrl && typeof data === 'string' && data.startsWith('http')) editedUrl = data;
        } catch (e) {
            console.log('JSON POST failed', e.response?.data || e.message);
        }
    }

    // Fallback GET
    if (!editedUrl) {
        try {
            const { data } = await axios.get(`${API}?prompt=${encodeURIComponent(rawQ)}&text=${encodeURIComponent(rawQ)}`, { timeout: 60000 });
            editedUrl = data.data?.url || data.url || data.data?.image_url;
        } catch {}
    }

    if (!editedUrl) throw new Error('No edited image returned. Try simpler prompt like "add sunglasses"');

    await conn.sendMessage(from, {
        image: { url: editedUrl },
        caption: `*✅ Qwen Edited*\n*Prompt:* ${rawQ}\n\n*${BRAND}*\n${CHANNEL_LINK}`,
        contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Qwen Edit Error:', e.response?.data? (e.response.data.toString? e.response.data.toString().slice(0,500) : JSON.stringify(e.response.data).slice(0,500)) : e.message);
    reply(`*❌ Qwen Edit Failed*\n${e.message}\n\n*Correct:*\nReply image + ${'.qwenedit add sunglasses'}`);
  }
});