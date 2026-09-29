const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/tools/faceswap';

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

async function downloadImage(mek, conn, useQuoted = false) {
    try {
        let msg = null;
        if (useQuoted) {
            msg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        } else {
            msg = mek.message?.imageMessage || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        }
        if (!msg) return null;
        const buf = await conn.downloadMediaMessage({ message: { imageMessage: msg } });
        return buf;
    } catch { return null; }
}

cmd({
  pattern: "faceswap",
  alias: ["swapface", "fswap", "swap"],
  react: "🔄",
  desc: "AI Face Swap - swap faces between 2 images",
  category: "progresstech ai",
  use: ".faceswap (reply to face, attach target) |.faceswap <url1> | <url2>",
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

    // MENU
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

        const menu = `┏━━〔 🔄 FaceSwap AI 〕━━┓
┃ AI-powered face swapping
┃
┃ *3 Ways to use:*
┃
┃ 1️⃣ *Reply + Attach:*
┃ Reply to face image, then send
┃ target image with caption:
┃ ${prefix}faceswap
┃
┃ 2️⃣ *With URLs:*
┃ ${prefix}faceswap https://url1.jpg | https://url2.jpg
┃
┃ 3️⃣ *Two images:*
┃ Send source face, then reply to it
┃ with target + ${prefix}faceswap
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🔄 How to use?", id: `${prefix}faceswap help` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🔄 FaceSwap • Progress Tech", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🔄", key: mek.key } });

    let sourceBuffer = null;
    let targetBuffer = null;
    let sourceUrl = null;
    let targetUrl = null;

    // Check if URLs provided
    if (rawQ.includes('http') && rawQ.includes('|')) {
        const parts = rawQ.split('|');
        sourceUrl = parts[0].trim();
        targetUrl = parts[1].trim();
        reply(`*🔄 Swapping faces from URLs...*\nSource: ${sourceUrl.slice(0,40)}...\nTarget: ${targetUrl.slice(0,40)}...`);
    } else if (rawQ.includes('http')) {
        // One URL + one image
        sourceUrl = rawQ.match(/https?:\/\/\S+/)?.[0];
        reply(`*🔄 URL + Image mode...*`);
    } else {
        // Image buffers mode
        // Try to get quoted image as source
        const quotedBuf = await downloadImage(mek, conn, true);
        const currentBuf = mek.message?.imageMessage? await conn.downloadMediaMessage(mek) : null;

        if (quotedBuf && currentBuf) {
            sourceBuffer = quotedBuf;
            targetBuffer = currentBuf;
        } else if (quotedBuf &&!currentBuf) {
            // Need second image - ask user to send second?
            // For now use quoted as source, and look for image in extended context
            sourceBuffer = quotedBuf;
            // Try to get from current if imageMessage exists in other format
            try {
                if (mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    // user replied to one image but we need another
                    // We'll treat quoted as source and wait for target? No, try get both from conversation
                    // Simple: if only one image, tell user to send 2 images
                }
            } catch {}
        } else if (currentBuf) {
            // Only current image provided - need reply
            sourceBuffer = currentBuf;
            const secondTry = await downloadImage(mek, conn, true);
            if (secondTry) targetBuffer = secondTry;
        }

        if (!sourceBuffer &&!sourceUrl) {
            return reply(`*❌ Need 2 images*\n\n*Method 1:*\nReply to a face image, then send another image with caption ${prefix}faceswap\n\n*Method 2:*\n${prefix}faceswap https://face1.jpg | https://face2.jpg\n\n_${BRAND}_`);
        }

        // If only one buffer and no URL, need to inform
        if (sourceBuffer &&!targetBuffer &&!targetUrl) {
            return reply(`*❌ Need 2nd image*\nYou sent 1 image. Now reply to a *different* face image with caption ${prefix}faceswap\n\nOr send: ${prefix}faceswap <url1> | <url2>`);
        }
    }

    // Build request
    let response;

    if (sourceUrl && targetUrl) {
        // JSON with URLs
        response = await axios.post(API, {
            source: sourceUrl,
            target: targetUrl,
            source_image: sourceUrl,
            target_image: targetUrl,
            source_url: sourceUrl,
            target_url: targetUrl
        }, {
            timeout: 120000,
            headers: { 'Content-Type': 'application/json' },
            responseType: 'arraybuffer'
        });
    } else if (sourceBuffer && targetBuffer) {
        // FormData with 2 images - Omegatech accepts uploaded images
        const form = new FormData();
        form.append('source', sourceBuffer, { filename: 'source.jpg', contentType: 'image/jpeg' });
        form.append('target', targetBuffer, { filename: 'target.jpg', contentType: 'image/jpeg' });
        form.append('source_image', sourceBuffer, { filename: 'source.jpg', contentType: 'image/jpeg' });
        form.append('target_image', targetBuffer, { filename: 'target.jpg', contentType: 'image/jpeg' });
        form.append('image1', sourceBuffer, { filename: 'source.jpg', contentType: 'image/jpeg' });
        form.append('image2', targetBuffer, { filename: 'target.jpg', contentType: 'image/jpeg' });

        response = await axios.post(API, form, {
            timeout: 120000,
            headers: {...form.getHeaders() },
            responseType: 'arraybuffer'
        });
    } else {
        // Mixed mode - one buffer one url
        const form = new FormData();
        if (sourceBuffer) {
            form.append('source', sourceBuffer, { filename: 'source.jpg', contentType: 'image/jpeg' });
        } else if (sourceUrl) {
            form.append('source', sourceUrl);
            form.append('source_url', sourceUrl);
        }
        if (targetBuffer) {
            form.append('target', targetBuffer, { filename: 'target.jpg', contentType: 'image/jpeg' });
        } else if (targetUrl) {
            form.append('target', targetUrl);
        }
        if (rawQ) {
            const url = rawQ.match(/https?:\/\/\S+/)?.[0];
            if (url) form.append('source_url', url);
        }

        response = await axios.post(API, form, {
            timeout: 120000,
            headers: {...form.getHeaders() },
            responseType: 'arraybuffer'
        });
    }

    // Response is raw image per your screenshot
    const contentType = response.headers['content-type'] || '';

    if (contentType.includes('image') || response.data) {
        const imageBuffer = Buffer.from(response.data);

        // Check if it's actually JSON error disguised as buffer
        try {
            const text = imageBuffer.toString('utf8');
            if (text.startsWith('{') && text.includes('url')) {
                const json = JSON.parse(text);
                const url = json.data?.url || json.url || json.data?.result || json.result;
                if (url) {
                    await conn.sendMessage(from, { image: { url }, caption: `*✅ FaceSwapped*\n${BRAND}`, contextInfo: ctx }, { quoted: mek });
                    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                    return;
                }
            }
        } catch {}

        await conn.sendMessage(from, { image: imageBuffer, caption: `*✅ FaceSwapped Successfully*\n${BRAND}\n${CHANNEL_LINK}`, contextInfo: ctx }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } else {
        throw new Error('Invalid response from API');
    }

  } catch (e) {
    console.error('FaceSwap Error:', e.response?.data? Buffer.from(e.response.data).toString().slice(0,500) : e.message);
    let errMsg = e.message;
    try {
        if (e.response?.data) errMsg = Buffer.from(e.response.data).toString('utf8').slice(0,500);
    } catch {}
    reply(`*❌ FaceSwap Failed*\n${errMsg}\n\n*Correct use:*\n1. Reply to face image, send target with ${prefix}faceswap\n2. ${prefix}faceswap https://url1.jpg | https://url2.jpg`);
  }
});