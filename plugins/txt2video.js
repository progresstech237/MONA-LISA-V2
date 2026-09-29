const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/ai/Txt2video';

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

cmd({
  pattern: "txt2video",
  alias: ["t2v", "text2video"],
  react: "🎬",
  desc: "Generate AI videos from text prompts with voiceover and aspect ratios",
  category: "progresstech ai",
  use: ".txt2video a cat dancing in space |.txt2video 16:9 a city at sunset with voiceover",
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
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z0-9-]+\\s*`, 'i'), '').trim();

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: NEWSLETTER_JID,
            serverMessageId: 1,
            newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
        }
    };

    if (!rawQ || rawQ.toLowerCase() === 'help' || rawQ.toLowerCase() === 'menu') {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) {
                const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer });
                thumb = media.imageMessage;
            }
        } catch {}

        const menu = `┏━━〔 🎬 Txt2Video AI 〕━━┓
┃ Generate AI videos from text
┃ Supports aspect ratios + voiceover
┃ Auto-rotates device ID on limit
┃
┃ *Usage:*
┃ ${prefix}txt2video a cat astronaut dancing in space
┃ ${prefix}txt2video 16:9 a futuristic city sunset cinematic
┃ ${prefix}txt2video 9:16 Mona Lisa afro girl singing, with voiceover
┃ ${prefix}txt2video 1:1 omah lay concert crowd
┃
┃ *Aspect Ratios:*
┃ 16:9 - YouTube / Landscape
┃ 9:16 - TikTok / Reels / Portrait
┃ 1:1 - Square
┃
┃ *Voiceover:* add word "voiceover" or "with voice"
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎬 16:9 Landscape", id: `${prefix}txt2video 16:9 a cinematic futuristic city at sunset, drones flying` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📱 9:16 Portrait", id: `${prefix}txt2video 9:16 Mona Lisa afro girl dancing, omah lay vibe, with voiceover` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎙️ With Voiceover", id: `${prefix}txt2video a motivational speech about success with AI voiceover` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🎬 Txt2Video • T2V API", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

    let prompt = rawQ;
    let aspectRatio = "16:9";
    let voiceover = false;

    // Detect aspect ratio
    const arMatch = rawQ.match(/(16:9|9:16|1:1|4:3|21:9)/i);
    if (arMatch) {
        aspectRatio = arMatch[1];
        prompt = rawQ.replace(arMatch[1], '').trim();
    }

    // Detect voiceover request
    if (rawQ.toLowerCase().includes('voiceover') || rawQ.toLowerCase().includes('with voice') || rawQ.toLowerCase().includes('voice over')) {
        voiceover = true;
        // keep prompt but we flag it
    }

    if (!prompt) prompt = rawQ;

    reply(`*🎬 Generating AI Video...*\n*Prompt:* ${prompt.slice(0,120)}\n*Ratio:* ${aspectRatio}\n*Voiceover:* ${voiceover? 'Yes' : 'No'}\n\n_Wait 30-90 sec... Device ID auto-rotates on limit_\n\n_${BRAND}_`);

    let videoUrl = null;

    // POST first
    try {
        const { data } = await axios.post(API, {
            prompt: prompt,
            text: prompt,
            query: prompt,
            aspect_ratio: aspectRatio,
            aspectRatio: aspectRatio,
            ratio: aspectRatio,
            voiceover: voiceover,
            voice_over: voiceover,
            with_voiceover: voiceover,
            device_id: `device_${Date.now()}`
        }, { timeout: 180000, headers: { 'Content-Type': 'application/json' } });

        videoUrl = data.data?.url || data.data?.video_url || data.data?.videoUrl || data.url || data.video_url || data.data?.link || data.link || data.data?.result || data.result;
        if (!videoUrl && typeof data.data === 'string' && data.data.startsWith('http')) videoUrl = data.data;
    } catch (e) {
        console.log('POST failed, trying GET', e.response?.data || e.message);
    }

    // GET fallback
    if (!videoUrl) {
        const urls = [
            `${API}?prompt=${encodeURIComponent(prompt)}&aspect_ratio=${encodeURIComponent(aspectRatio)}&voiceover=${voiceover}`,
            `${API}?text=${encodeURIComponent(prompt)}&ratio=${aspectRatio}&voiceover=${voiceover}`,
            `${API}?prompt=${encodeURIComponent(prompt)}&aspectRatio=${aspectRatio}&voice_over=${voiceover}`
        ];
        for (const u of urls) {
            try {
                const { data } = await axios.get(u, { timeout: 180000 });
                videoUrl = data.data?.url || data.data?.video_url || data.url || data.video_url || data.data?.result;
                if (!videoUrl && typeof data.data === 'string' && data.data.startsWith('http')) videoUrl = data.data;
                if (videoUrl) break;
            } catch {}
        }
    }

    if (!videoUrl) throw new Error('No video URL returned from T2V API');

    await conn.sendMessage(from, {
        video: { url: videoUrl },
        caption: `*✅ Video Generated*\n*Prompt:* ${prompt}\n*Ratio:* ${aspectRatio}\n*Voiceover:* ${voiceover? 'Yes' : 'No'}\n\n*${BRAND}*\n${CHANNEL_LINK}`,
        contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Txt2Video Error:', e.response?.data || e.message);
    reply(`*❌ Txt2Video Failed*\n${e.response?.data?.message || e.message}\n\nTry simpler: ${e.response?.data? '' : ''}\n${'.txt2video a cat dancing in space'}`);
  }
});