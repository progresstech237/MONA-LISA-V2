const { cmd } = require('../redx');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const fs = require('fs');

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/di2a9lenz/image/upload/v1786909227/omegatech_ai_media/upload-1786909226872.jpg';

// FIXED: Added 2 fallbacks for upload
async function uploadFileToCDN(buffer, filename) {
    // Try 1: malvryx
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: filename || 'audio.mp3' });
        form.append('type', 'permanent');
        const { data } = await axios.post('https://tmp.malvryx.dev/upload', form, {
            headers: form.getHeaders(), timeout: 30000
        });
        if (data?.cdnUrl || data?.directUrl) return data.cdnUrl || data.directUrl;
    } catch (e) { console.log('Upload try1 failed:', e.message); }

    // Try 2: catbox (most stable for audio)
    try {
        const form2 = new FormData();
        form2.append('reqtype', 'fileupload');
        form2.append('fileToUpload', buffer, { filename: filename || 'audio.mp3' });
        const { data } = await axios.post('https://catbox.moe/user/api.php', form2, {
            headers: form2.getHeaders(), timeout: 30000
        });
        if (data && data.startsWith('http')) return data;
    } catch (e) { console.log('Upload try2 failed:', e.message); }

    return null;
}

async function transcribeAudio(audioUrl, scenario = 'auto') {
    const apiUrl = `https://api.omegatech.app/api/tools/audio-transcribe?audioUrl=${encodeURIComponent(audioUrl)}&scenario=${encodeURIComponent(scenario)}`;
    const { data } = await axios.get(apiUrl, { timeout: 90000 });
    if (!data.success &&!data.transcription) throw new Error(data.message || 'Transcription failed');
    return data;
}

async function sendRichResponse(conn, chatId, data, audioUrl, scenario, taggedUsers = []) {
    try {
        const messageSecret = crypto.randomBytes(32).toString('base64');
        const stanzaId = crypto.randomBytes(16).toString('hex').toUpperCase();
        const responseId = crypto.randomUUID();
        const transcription = data.transcription || data.data?.transcription || 'No transcription available.';
        const duration = data.durationMinutes || data.data?.durationMinutes || 'N/A';
        const language = data.languageCode || data.data?.languageCode || 'auto';

        const responseData = {
            "response_id": responseId,
            "sections": [
                { "view_model": { "primitive": { "title": "🎤 Audio Transcription", "brand": "Progress Tech AI", "price": `⏱️ ${duration}m`, "product_url": "https://wa.me/237682432296", "image": { "url": CLOUDINARY_IMAGE, "mime_type": "image/jpeg" }, "additional_images": [], "__typename": "GenAIProductItemCardPrimitive" }, "__typename": "GenAISingleLayoutViewModel" }, "__typename": "GenAIUnifiedResponseSection" },
                { "view_model": { "primitive": { "text": `*✅ Transcription Complete!*\n\n*🎯 Scenario:* ${scenario}\n*🌐 Language:* ${language}\n*⏱️ Duration:* ${duration} minute(s)\n\n*📝 Transcription:*\n${transcription.slice(0, 3000)}${transcription.length > 3000? '...' : ''}`, "inline_entities": [], "__typename": "GenAIMarkdownTextUXPrimitive" }, "__typename": "GenAISingleLayoutViewModel" }, "__typename": "GenAIUnifiedResponseSection" }
            ]
        };

        await conn.relayMessage(chatId, {
            senderKeyDistributionMessage: { groupId: "120363425020013890@g.us", axolotlSenderKeyDistributionMessage: Buffer.from("Mwi6ieeLBxAHGiD/fbbPrF6NXxievrFYIENndR2KJc/bUm+NZ8Ihva8dGCIhBYacW+mUtF7tWBfr+yb2z1WQoIYpEj/chPPWWQm3j5El", "base64") },
            messageContextInfo: { messageSecret, botMetadata: { messageDisclaimerText: "Progress Tech Audio Transcription", botResponseId: responseId } },
            botForwardedMessage: { message: { richResponseMessage: { messageType: 1, unifiedResponse: { data: Buffer.from(JSON.stringify(responseData)).toString('base64') }, contextInfo: { stanzaId, participant: "237682432296@s.whatsapp.net", quotedMessage: { extendedTextMessage: { text: "Transcription result", previewType: 0 } }, forwardingScore: 1, isForwarded: true, mentionedJid: taggedUsers } } } }
        }, {});
        return true;
    } catch (e) { console.error('Rich send fail:', e.message); return false; }
}

cmd({
  pattern: "transcribe",
  alias: ["transcript", "voice2text"],
  react: "🎤",
  desc: "Transcribe audio files using AI",
  category: "progresstech tools",
  use: ".transcribe (reply to audio) |.transcribe <audio_url> --scenario meeting",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let audioUrl = null;
    let scenario = 'auto';
    let text = q || '';

    const scenarioMatch = text.match(/--scenario\s+([^\s]+)/i);
    if (scenarioMatch) {
        scenario = scenarioMatch[1];
        text = text.replace(/--scenario\s+[^\s]+/i, '').trim();
    }

    // ===== FIXED: PROPER QUOTED AUDIO DETECTION FOR REDX =====
    let quoted = m.quoted;
    let isAudioQuoted = false;

    if (quoted) {
        // redx way: check mtype
        if (quoted.mtype === 'audioMessage') isAudioQuoted = true;
        if (quoted.message?.audioMessage) isAudioQuoted = true;
        if (quoted.msg?.mimetype?.includes('audio')) isAudioQuoted = true;
        // for ptt
        if (quoted.type === 'audioMessage') isAudioQuoted = true;
    }

    // Also check if user sent audio with caption.transcribe
    const isDirectAudio = m.mtype === 'audioMessage' || m.msg?.mimetype?.includes('audio');

    if (isAudioQuoted || isDirectAudio) {
        const target = isAudioQuoted? quoted : m;
        await reply(`*📤 Downloading audio...*`);
        try {
            const media = await target.download();
            if (!media) throw new Error('Download returned empty');
            await reply(`*📤 Uploading audio to server...*`);
            audioUrl = await uploadFileToCDN(media, `audio_${Date.now()}.mp3`);
            if (!audioUrl) return reply(`*❌ Failed to upload audio to both servers. Try sending as link:*\n.transcribe https://files.catbox.moe/xxxx.mp3`);
        } catch (dlErr) {
            console.error('DL Error:', dlErr);
            return reply(`*❌ Download failed:* ${dlErr.message}`);
        }
    }

    // URL from args
    if (!audioUrl && text && text.match(/^https?:\/\/[^\s]+$/)) {
        audioUrl = text.trim();
    }
    if (!audioUrl && text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) audioUrl = urlMatch[1];
    }

    if (!audioUrl) {
        return reply(`*🎤 AUDIO TRANSCRIPTION 👑*\n\n*Transcribe audio files to text using AI.*\n\n*Usage:*\n*👑 ${prefix}transcribe (reply to audio) 👑*\n*👑 ${prefix}transcribe <audio_url> 👑*\n\n*Examples:*\n*👑 ${prefix}transcribe (reply to voice note) 👑*\n*👑 ${prefix}transcribe https://example.com/audio.mp3 👑*\n*👑 ${prefix}transcribe <url> --scenario meeting 👑*\n\n*🎯 Scenarios: auto, meeting, interview, lecture, etc.*\n\n*⚡ Powered by PROGRESS AI*`);
    }

    await reply(`*⏳ Transcribing audio... This may take a moment.*\n*URL:* ${audioUrl.slice(0,60)}...\n*Scenario:* ${scenario}`);

    const result = await transcribeAudio(audioUrl, scenario);
    const transcription = result.transcription || result.data?.transcription;

    if (!transcription) {
        console.log('Full result:', result);
        throw new Error('API returned no text');
    }

    await sendRichResponse(conn, from, result, audioUrl, scenario, [m.sender]);

    // plain fallback (guaranteed to show)
    let fallback = `*✅ TRANSCRIPTION COMPLETE 👑*\n\n*🎯 Scenario:* ${scenario}\n*🌐 Language:* ${result.languageCode || result.data?.languageCode || 'auto'}\n*⏱️ Duration:* ${result.durationMinutes || result.data?.durationMinutes || 'N/A'}m\n\n*📝 Transcription:*\n${transcription}`;
    await conn.sendMessage(from, { text: fallback }, { quoted: mek });

  } catch (e) {
    console.error('Transcribe error:', e.response?.data || e.message);
    reply(`*❌ Error: ${e.message || 'Unknown error'}*\nTry shorter audio or check link.`);
  }
});