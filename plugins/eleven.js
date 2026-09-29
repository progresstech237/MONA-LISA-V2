const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/elevenlabs';

cmd({
  pattern: "eleven",
  alias: ["elevenlabs", "tts", "say", "bella", "arnold", "krishna"],
  react: "🎙️",
  desc: "ElevenLabs TTS Voice Note - arnold, bella, krishna",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🎙️ ELEVENLABS - VOICE NOTE ✅* ─
│ Voices: arnold, bella, krishna
│
├─ *📌 USAGE - VOICE NOTE*
│.eleven How are you doing | bella
│.eleven Hello Dixon | arnold
│.eleven I love you | krishna
│
├─ *🔥 VOICES*
│ bella - Female soft
│ arnold - Male deep
│ krishna - Male calm
│
╰─ Sends as VOICE NOTE not file`
      );
    }

    await conn.sendMessage(from, { react: { text: "🎙️", key: mek.key } });
    await conn.sendPresenceUpdate('recording', from);

    // Parse text | voice
    let text = q;
    let voice = 'bella';
    const voices = ['arnold','bella','krishna'];

    if (q.includes('|')) {
      const parts = q.split('|').map(s => s.trim());
      if (voices.includes(parts[1]?.toLowerCase())) {
        text = parts[0];
        voice = parts[1].toLowerCase();
      } else if (voices.includes(parts[0]?.toLowerCase())) {
        voice = parts[0].toLowerCase();
        text = parts[1];
      }
    } else {
      const first = q.split(' ')[0].toLowerCase();
      if (voices.includes(first)) {
        voice = first;
        text = q.slice(first.length).trim();
      }
    }

    if (!text) return reply('❌ Text needed. Ex:.eleven How are you doing | bella');

    // Call Omegatech
    const { data } = await axios.get(API, {
      params: { text, voice },
      timeout: 60000
    });

    const audioUrl = data?.data?.audioUrl || data?.audioUrl;
    if (!audioUrl) throw new Error('No audioUrl: ' + JSON.stringify(data).slice(0,400));

    // Download MP3
    const audioRes = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    const audioBuffer = Buffer.from(audioRes.data);

    // SEND AS VOICE NOTE - 100% WORKS - ptt: true
    await conn.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      ptt: true,
      waveform: new Uint8Array([10,20,35,25,40,55,30,60,45,70,35,25,15,30,50,40])
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Eleven v2 error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}\nTry:.eleven How are you doing | bella`);
  }
});
