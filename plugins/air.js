const { cmd } = require('../redx');
const axios = require('axios');

const BASE = 'https://eliteprotech-apis.zone.id/ai/airmore';

cmd({
  pattern: "airmore",
  alias: ["tts","say","voiceai"],
  react: "🎙️",
  desc: "AirMore TTS - ChristopherMultilingual",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  if(!q) return reply('Use:.airmore Hii how are you\nOptional voice:.airmore --voice=ChristopherMultilingual Hello world');

  try{
    await conn.sendMessage(m.chat, { react: { text: "🎧", key: mek.key } });

    let voice = "ChristopherMultilingual";
    let text = q;

    // allow.airmore --voice=Emma Hii
    if(q.includes('--voice=')){
      const match = q.match(/--voice=([^\s]+)/);
      if(match){ voice = match[1]; text = q.replace(match[0],'').trim(); }
    }

    const url = `${BASE}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
    const { data } = await axios.get(url, { timeout: 60000 });

    if(!data.status &&!data.success) return reply(`❌ TTS failed: ${JSON.stringify(data).slice(0,600)}`);

    const audioUrl = data.result?.audio_url || data.audio_url || data.result;
    if(!audioUrl) return reply('No audio URL returned');

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      ptt: false,
      caption: `*🎙️ AirMore TTS*\nVoice: ${voice}\nText: ${text.slice(0,100)}`
    }, { quoted: mek });

  }catch(e){
    reply(`❌ Error: ${e.response? JSON.stringify(e.response.data).slice(0,600) : e.message}`);
  }
});