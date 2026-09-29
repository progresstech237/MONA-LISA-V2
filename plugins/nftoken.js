const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

let store = {}; // REDX doesn't have global.db, we use memory store

function getBotThumb() {
    try {
        const files = ['./media/menu1.png','./media/menu2.png','./media/menu3.png','./media/logo.jpg'];
        for (const p of files) if (fs.existsSync(p)) return fs.readFileSync(p);
        return null;
    } catch { return null; }
}

async function generateNFToken(retries = 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get('https://api.omegatech.app/api/tools/Nftoken?action=generate', { timeout: 30000 });
            if (data.success && data.data?.token) return data;
            throw new Error('Generation failed');
        } catch (e) {
            lastError = e;
            console.log(`[NFToken] Retry ${i+1}/${retries}: ${e.message}`);
            if (i < retries - 1) await new Promise(r => setTimeout(r, 1000*(i+1)));
        }
    }
    throw lastError;
}

cmd({
  pattern: "nftoken",
  alias: ["nft", "netflix", "nftok"],
  react: "🎬",
  desc: "Netflix NFToken Generator - Omegatech v1.0",
  category: "tools",
  use: ".nft",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const pre = prefix || '.';
    const sender = m.sender;
    const args = q?.trim().split(' ').filter(Boolean) || [];
    const sub = args[0]?.toLowerCase() || '';

    // ===== COPY LINK =====
    if (sub === 'copy' && args[1]!== undefined) {
        const idx = parseInt(args[1]);
        const saved = store[from] || store[sender];
        if (!saved) return reply('⚠️ No NFToken found. Generate first with.nft');
        const links = saved.data.links.all || saved.data.links || [];
        if (idx >= links.length || isNaN(idx)) return reply('❌ Invalid device selection.');
        const sel = links[idx];
        await conn.sendMessage(from, {
            text: `📱 *${sel.device}*\n\n🔗 \`${sel.url}\`\n\n📋 Tap and hold to copy the link.`,
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "📋", key: mek.key } });
        return;
    }

    // ===== COPY TOKEN =====
    if (sub === 'token') {
        const saved = store[from] || store[sender];
        if (!saved) return reply('⚠️ No NFToken found. Generate first with.nft');
        await conn.sendMessage(from, {
            text: `🔑 *NFToken*\n\n\`${saved.data.token}\`\n\n📋 Tap and hold to copy the token.`,
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "📋", key: mek.key } });
        return;
    }

    // ===== GENERATE NEW =====
    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    reply('🔄 Generating NFToken...');

    const result = await generateNFToken(3);
    const data = result.data;
    const token = data.token;
    const links = data.links.all || [];
    const generatedAt = data.generatedAt || new Date().toISOString();

    store[from] = { data, timestamp: Date.now() };
    store[sender] = { data, timestamp: Date.now() };

    let imageMessage;
    try {
        const thumb = getBotThumb();
        if (thumb) {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const media = await prepareWAMessageMedia({ image: thumb }, { upload: conn.waUploadToServer });
            imageMessage = media.imageMessage;
        }
    } catch (e) { console.log('thumb error', e.message); }

    let menuText = `┏━━〔 🎬 NFToken Generator 〕━━┓
┃ 🔑 Token: ${token.substring(0, 40)}...
┃ 📱 Devices: ${links.length}
┃ 🕐 Generated: ${new Date(generatedAt).toLocaleString()}
┗━━━━━━━━━━━━━━┛

📌 *Select a device below to copy the link:*`;

    const buttons = [];

    links.slice(0, 4).forEach((link, index) => {
        buttons.push({
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: `📱 ${link.device}`,
                sections: [{
                    title: link.device,
                    highlight_label: "🔗 Copy",
                    rows: [{ id: `${pre}nftoken copy ${index}`, title: link.device, description: `Copy ${link.device} link` }]
                }]
            })
        });
    });

    // Reserve slot for token + regen (total max 5 for WA)
    if (buttons.length < 4) {
        buttons.push({
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: "🔑 Copy Token",
                sections: [{ title: "Token", highlight_label: "📋", rows: [{ id: `${pre}nftoken token`, title: "Copy Token", description: "Copy the raw token" }] }]
            })
        });
    }

    if (buttons.length < 5) {
        buttons.push({
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: "🔄 Regenerate",
                sections: [{ title: "Generate New", highlight_label: "🔄", rows: [{ id: `${pre}nftoken`, title: "Generate New", description: "Create a fresh NFToken" }] }]
            })
        });
    }

    // Add channel button if space
    if (buttons.length < 5) {
        buttons.push({
            name: "cta_url",
            buttonParamsJson: JSON.stringify({ display_text: "📢 Channel", url: "https://whatsapp.com/channel/0029Vb785rSBlHpWSitPY61i" })
        });
    }

    const interactiveMsg = {
        interactiveMessage: {
            header: { title: "🎬 Netflix NFToken", hasMediaAttachment:!!imageMessage,...(imageMessage? { imageMessage } : {}) },
            body: { text: menuText.substring(0, 2000) },
            footer: { text: "🔹 Powered by Omegatech • NFToken v1.0 ✓" },
            nativeFlowMessage: { buttons: buttons.slice(0, 5) }
        },
        contextInfo: {
            forwardingScore: 999, isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363403299118246@newsletter',
                serverMessageId: 142,
                newsletterName: 'Lady-Trish Channel ✓'
            }
        }
    };

    await conn.relayMessage(from, interactiveMsg, {});
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('NFToken Error:', e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply(`❌ Failed to generate NFToken.\nError: ${e.message}\n\n💡 Please try again later.`);
  }
});