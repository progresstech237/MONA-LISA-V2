const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/text2speech-v3';
const API2 = 'https://api.dixonomega.tech/api/ai/text2speech-v3';

cmd({
  pattern: "tts2",
  alias: ["say2", "speak2"],
  react: "🎙️",
  desc: "Text to speech v3",
  category: "progresstech ai",
  use: ".tts2 woman1 how are you doing",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    if (!q) return reply(`*Usage:*\n${prefix}tts2 how are you doing\n${prefix}tts2 woman1 how are you doing\nVoices: woman1, man1, woman2`);

    let voice = 'woman1';
    let text = q;

    // check if first word is voice name
    const first = q.split(' ')[0].toLowerCase();
    if (['woman1','man1','woman2','man2','woman3'].includes(first)) {
        voice = first;
        text = q.slice(first.length).trim();
    }
    if (!text) return reply(`*Enter text bro*\n${prefix}tts2 woman1 hello`);

    await conn.sendMessage(from, {
        text: `*🎙️ Generating speech...*\nVoice: *${voice}*\nText: ${text.slice(0,50)}`
    }, { quoted: mek });

    let audioUrl = null;

    // Try GET
    try {
        const { data } = await axios.get(API, { params: { text, voice }, timeout: 30000 });
        console.log('TTS2:', JSON.stringify(data).slice(0,400));
        audioUrl = data.audioUrl || data.audio_url || data.url || data.result || data.data?.url;
        if (typeof data === 'string' && data.startsWith('http')) audioUrl = data;
    } catch(e){ console.log('TTS2 GET1 fail', e.message); }

    if (!audioUrl) {
        try {
            const { data } = await axios.get(API2, { params: { text, voice, language: 'en' }, timeout: 30000 });
            audioUrl = data.audioUrl || data.audio_url || data.url;
        } catch(e){}
    }

    if (!audioUrl) throw new Error('No audio URL returned');

    // Download buffer
    const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const buffer = Buffer.from(audioRes.data);

    // IMPORTANT: Check if buffer is actually JSON/HTML error
    if (buffer.length < 1000) {
        const txt = buffer.toString('utf8');
        if (txt.includes('{') || txt.includes('<')) throw new Error('API returned error file: ' + txt.slice(0,200));
    }

    // FIX: Send as normal audio, NOT ptt:true first
    // ptt:true = only works with opus ogg, mpeg will break
    await conn.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        ptt: false, // <--- FIXED, was true before
        fileName: 'voice.mp3'
    }, { quoted: mek });

    // Then also send as voice note if you want, but convert mimetype
    // If you MUST send ptt, use this second message with ogg
    // await conn.sendMessage(from, { audio: buffer, mimetype: 'audio/mp3', ptt: true }, { quoted: mek });

  } catch (e) {
    console.error('TTS2 ERROR:', e.response?.data || e.message);
    reply(`*❌ TTS Failed*\n${e.message}\nTry short text`);
  }
});