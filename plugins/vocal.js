const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://eliteprotech-apis.zone.id/tools/vocalremove';

async function uploadToCatbox(filePath) {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));
    const { data } = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 60000 });
    return data;
  } catch { return null; }
}

cmd({
  pattern: "vocalremove",
  alias: ["remixvocal","novocal","karaoke","vocalremover"],
  react: "🎙️",
  desc: "Vocal Remover - Remove vocals from audio",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const ctx = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: NEWSLETTER_JID,
        serverMessageId: 142,
        newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
      }
    };

    const quoted = m.quoted || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasAudio = quoted && (quoted.audioMessage || quoted.pttMessage || quoted.documentMessage);
    
    if (!q && !hasAudio) {
      const menu = `┏━━〔 🎙️ VocalRemove 〕━━┓
┃ Remove vocals / Make karaoke
┃ Provider: eliteprotech-apis.zone.id
┃
┃ *Use:*
┃ Reply to audio with ${prefix}vocalremove
┃ ${prefix}vocalremove <audio_url>
┃ ${prefix}karaoke <audio_url>
┃
┃ Supports: mp3, wav, m4a, ogg
┗━━━━━━━━━━━━━━┛`;
      return await conn.sendMessage(from, { text: menu, contextInfo: ctx }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "🎧", key: mek.key } });

    let audioUrl = q?.trim() || null;
    let tmpFile = null;

    // If reply to audio, download it
    if (hasAudio) {
      try {
        const buffer = await conn.downloadMediaMessage(m.quoted ? { message: { audioMessage: quoted.audioMessage || quoted.pttMessage } } : mek);
        if (!buffer) throw new Error('Download failed');
        tmpFile = path.join(__dirname, `../tmp_vocal_${Date.now()}.mp3`);
        fs.writeFileSync(tmpFile, buffer);
        const uploaded = await uploadToCatbox(tmpFile);
        if (uploaded && uploaded.startsWith('http')) audioUrl = uploaded;
      } catch (e) {
        return reply(`❌ Failed to download audio: ${e.message}\nTry sending audio URL directly.`);
      }
    }

    if (!audioUrl) return reply(`❌ Provide audio URL or reply to an audio.\nEx: ${prefix}vocalremove https://example.com/song.mp3`);

    await reply(`*🎙️ Processing...*\nRemoving vocals from audio.\nThis may take 20-40s.`);

    // Try 3 methods: ?url= , ?audio= , POST file
    let resultData = null;
    try {
      // Method 1: ?url=
      const { data } = await axios.get(`${API}?url=${encodeURIComponent(audioUrl)}`, { timeout: 120000 });
      resultData = data;
    } catch {
      try {
        // Method 2: ?audio=
        const { data } = await axios.get(`${API}?audio=${encodeURIComponent(audioUrl)}`, { timeout: 120000 });
        resultData = data;
      } catch {
        // Method 3: POST with url field
        try {
          const form = new FormData();
          form.append('url', audioUrl);
          if (tmpFile && fs.existsSync(tmpFile)) form.append('file', fs.createReadStream(tmpFile));
          const { data } = await axios.post(API, form, { headers: form.getHeaders(), timeout: 120000 });
          resultData = data;
        } catch (e) {
          resultData = null;
        }
      }
    }

    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);

    if (!resultData) return reply(`❌ API failed. The tool may need file upload. Try different audio.`);

    // Response can be {success, result: url} or {instrumental, vocal}
    const resStr = JSON.stringify(resultData);
    let instrumental = resultData.result || resultData.instrumental || resultData.no_vocal || resultData.karaoke || resultData.data;
    let vocal = resultData.vocal || resultData.vocals || null;

    if (typeof instrumental === 'object') {
      vocal = instrumental.vocal || instrumental.vocals || vocal;
      instrumental = instrumental.instrumental || instrumental.url || instrumental.karaoke;
    }

    if (!instrumental && resultData.url) instrumental = resultData.url;
    if (!instrumental) return reply(`❌ No result found:\n${resStr.slice(0,800)}`);

    await conn.sendMessage(from, {
      audio: { url: instrumental },
      mimetype: 'audio/mpeg',
      ptt: false,
      caption: `*🎧 Instrumental (No Vocal)*\n\n_${BRAND}_`,
      contextInfo: ctx
    }, { quoted: mek });

    if (vocal) {
      await conn.sendMessage(from, {
        audio: { url: vocal },
        mimetype: 'audio/mpeg',
        ptt: false,
        caption: `*🎙️ Vocals Only*\n\n_${BRAND}_`,
        contextInfo: ctx
      }, { quoted: mek });
    }

  } catch (e) {
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,500) : e.message}`);
  }
});