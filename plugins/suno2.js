const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png','./media/menu3.png','./media/menu-main.jpg']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

cmd({
  pattern: "sonu2",
  alias: ["sonupro", "musicai"],
  react: "🎵",
  desc: "Generate AI Music with Sonu Pro",
  category: "progresstech ai",
  use: ".sonu afrobeat love song | .sonu instrumental | afrobeat | Mona Lisa",
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
    if (rawQ.startsWith(prefix)) rawQ = rawQ.slice(prefix.length);

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: NEWSLETTER_JID,
            serverMessageId: 1,
            newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
        }
    };

    if (!rawQ || rawQ.toLowerCase() === 'help' || rawQ.toLowerCase() === 'login') {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) {
                const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer });
                thumb = media.imageMessage;
            }
        } catch {}

        const text = `┏━━〔 🎵 Sonu Pro Music 〕━━┓
┃ Generate AI music tracks
┃ With ChatMusicPro
┃
┃ 📌 *Usage:*
┃ ${prefix}sonu <prompt> | <lyrics>
┃ ${prefix}sonu afrobeat, omah lay vibe | Mona Lisa lyrics...
┃ ${prefix}sonu instrumental; afro soul chill
┃
┃ Supports: custom prompts, lyrics, instrumental, multiple models
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎤 Afro Love Song", id: `${prefix}sonu afrobeat love song, omah lay vibe, 102 BPM | ${encodeURIComponent('Oh Mona Lisa, why you fine like that?')}` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎹 Instrumental", id: `${prefix}sonu instrumental; afro soul chill beat, soft guitar, log drums` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🎵 Sonu Pro • AI Music Generator", hasMediaAttachment: !!thumb, ...(thumb ? { imageMessage: thumb } : {}) },
                body: { text },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🎧", key: mek.key } });
    reply(`*🎵 Generating music with Sonu Pro...*\n*Prompt:* ${rawQ.slice(0,100)}\n\n_This may take 30-60 sec for 3min track_`);

    // Parse prompt | lyrics format
    let prompt = rawQ;
    let lyrics = "";
    let instrumental = false;

    if (rawQ.toLowerCase().includes('instrumental')) instrumental = true;
    if (rawQ.includes('|')) {
        const parts = rawQ.split('|');
        prompt = parts[0].trim();
        lyrics = parts[1].trim();
    } else if (rawQ.includes(';')) {
        const parts = rawQ.split(';');
        prompt = parts[0].trim();
        lyrics = parts.slice(1).join(';').trim();
    }

    // ✅ Main API Call - POST version (Working as per your screenshot)
    const payload = {
        prompt: prompt,
        lyrics: lyrics,
        instrumental: instrumental,
        model: "v4", // ChatMusicPro latest
        action: "generate"
    };

    const { data } = await axios.post('https://api.omegatech.app/api/ai/sonu-pro', payload, {
        timeout: 120000,
        headers: { 'Content-Type': 'application/json' }
    });

    // Omegatech response patterns
    const audioUrl = data.data?.audio_url || data.data?.url || data.audio_url || data.url || data.data?.link || data.link;
    const title = data.data?.title || "Sonu Pro Track";
    const duration = data.data?.duration || "";

    if (!audioUrl) {
        console.log('Sonu raw:', JSON.stringify(data).slice(0,1000));
        // Fallback try GET method
        const getUrl = `https://api.omegatech.app/api/ai/sonu-pro?action=generate&prompt=${encodeURIComponent(prompt)}&lyrics=${encodeURIComponent(lyrics)}&instrumental=${instrumental}`;
        const { data: getData } = await axios.get(getUrl, { timeout: 120000 });
        const audioUrl2 = getData.data?.audio_url || getData.audio_url || getData.data?.url;
        if (!audioUrl2) throw new Error('No audio_url returned. Check API limit.');
        
        await conn.sendMessage(from, {
            audio: { url: audioUrl2 },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: ctx,
            caption: `*🎵 ${title}*\n${BRAND}`
        }, { quoted: mek });
        return;
    }

    // Send audio
    await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, {
        text: `*✅ Music Generated*\n\n*🎵 Title:* ${title}\n*⏱️ Duration:* ${duration}\n*🎧 Prompt:* ${prompt}\n${lyrics ? `*📝 Lyrics:* ${lyrics.slice(0,200)}...\n` : ''}\n*${BRAND}*\n${CHANNEL_LINK}`,
        contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Sonu Error:', e.response?.data || e.message);
    reply(`*❌ Sonu Pro Failed*\n\n${e.response?.data?.message || e.message}\n\n_Try:_ ${prefix}sonu afrobeat chill`);
  }
});