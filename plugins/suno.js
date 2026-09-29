const { cmd } = require('../redx');
const axios = require('axios');

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/di2a9lenz/image/upload/v1786909227/omegatech_ai_media/upload-1786909226872.jpg';

const MUSIC_STYLES = [
    'Pop', 'Rock', 'Hip-Hop', 'R&B', 'EDM', 'Jazz', 'Classical', 'Country',
    'Metal', 'Reggae', 'Blues', 'Folk', 'Soul', 'Funk', 'Disco', 'House',
    'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'Lo-fi', 'Acoustic'
];

const activeGenerations = new Set();

async function generateMusicOld(prompt) {
    if (!prompt) throw "Prompt is required";
    const url = `https://omegatech-api.dixonomega.tech/api/ai/sonu3?action=full&prompt=${encodeURIComponent(prompt)}`;
    const { data } = await axios.get(url, { timeout: 120000 });
    // fix: API sometimes returns {data: {...}} 
    const d = data.data || data;
    if (!d?.url && !d?.audio_url) throw "No music generated";
    return {
        title: d.title || prompt.slice(0,20),
        audio_url: d.url || d.audio_url,
        image_url: d.thumbnail || d.image_url || CLOUDINARY_IMAGE,
        lyrics: d.lyrics || 'No lyrics available.',
        tags: d.tags || 'N/A',
        duration: d.duration || 0,
    };
}

async function generateMusicNew(prompt, title, musicStyle = 'Pop') {
    if (!prompt) throw "Prompt is required";
    const url = `https://api.omegatech.app/api/ai/sonu-pro?action=generate&prompt=${encodeURIComponent(prompt)}&title=${encodeURIComponent(title || prompt)}&isInstrumental=false&musicStyle=${encodeURIComponent(musicStyle)}`;
    const { data } = await axios.get(url, { timeout: 120000 });
    if (!data?.success) throw "No music generated";
    return data;
}

async function sendSafeMusicCard(conn, chatId, track, prompt, style, quoted) {
    try {
        const title = track.title || prompt;
        const cover = track.coverImage || track.image_url || track.thumbnail || CLOUDINARY_IMAGE;
        const lyrics = (track.lyrics || '').slice(0,1000);
        const duration = track.duration || 'N/A';
        
        let caption = `*🎵 ${title}*\n\n`;
        caption += `*🎼 Style:* ${style}\n`;
        caption += `*⏱️ Duration:* ${duration}s\n`;
        caption += `*📝 Prompt:* ${prompt.slice(0,100)}${prompt.length>100?'...':''}\n`;
        if(lyrics && lyrics !== 'No lyrics available.') {
            caption += `\n*🎤 Lyrics:*\n${lyrics.slice(0,800)}${lyrics.length>800?'...':''}\n`;
        }
        caption += `\n*⚡ Powered by Progress Tech*`;
        caption += `\n📢 https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P`;

        await conn.sendMessage(chatId, {
            image: { url: cover },
            caption: caption,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `Style: ${style} • ${duration}s`,
                    thumbnailUrl: cover,
                    sourceUrl: "https://wa.me/237682432296",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted });
    } catch(e) {
        console.log("Card error:", e.message);
    }
}

cmd({
  pattern: "suno",
  alias: ["sonu", "sunoai"],
  react: "🎵",
  desc: "Generate AI music from text prompt",
  category: "ai",
  use: ".suno <prompt>",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  let musicStyle = 'Pop';
  let isQuick = false;
  let prompt = q || '';

  try {
    if (!q) {
      return reply(`*🎵 SUNO MUSIC GENERATOR 👑*\n\n*Generate AI music from text prompts.*\n\n*Usage:*\n*👑 ${prefix}suno <prompt> 👑*\n\n*Examples:*\n*👑 ${prefix}suno Sad song about lost love 👑*\n*👑 ${prefix}suno Energetic EDM beat 👑*\n\n*Available Styles:* ${MUSIC_STYLES.join(', ')}\n\n*Quick:* ${prefix}suno love song --quick\n*With Style:* ${prefix}suno love song --style Pop\n\n*Powered by Omegatech AI*`);
    }

    const hasQuick = q.toLowerCase().includes('--quick');
    const styleMatch = q.match(/--style\s+([^\s]+)/i);

    if (hasQuick) {
      isQuick = true;
      prompt = q.replace(/--quick/i, '').trim();
    } else if (styleMatch) {
      musicStyle = styleMatch[1];
      prompt = q.replace(/--style\s+[^\s]+/i, '').trim();
    } else {
      // Show style list
      let listText = `*🎵 SUNO MUSIC GENERATOR 👑*\n\n*📝 Prompt:* ${q.substring(0, 100)}\n\n*🎼 Select Style by typing:*\n*👑 ${prefix}suno ${q} --style Pop 👑*\n\n*Available Styles:*\n`;
      MUSIC_STYLES.forEach(s => { listText += `• ${s}\n`; });
      listText += `\n*Quick Generate:*\n*👑 ${prefix}suno ${q} --quick 👑*`;
      return reply(listText);
    }

    const genKey = `${m.sender}_${prompt}_${isQuick? 'quick' : musicStyle}`;
    if (activeGenerations.has(genKey)) {
      return reply(`*⏳ A song is already being generated. Please wait...*`);
    }
    activeGenerations.add(genKey);

    await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });
    reply(`*⏳ Generating: ${prompt} [${musicStyle}]... please wait ~60 sec*`);

    if (isQuick) {
      const track = await generateMusicOld(prompt);
      await sendSafeMusicCard(conn, from, track, prompt, 'Default', mek);

      const audioRes = await axios.get(track.audio_url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 120000
      });
      await conn.sendMessage(from, {
        audio: Buffer.from(audioRes.data),
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${track.title}.mp3`,
      }, { quoted: mek });

    } else {
      const result = await generateMusicNew(prompt, prompt, musicStyle);
      const track = result.data.tracks[0];
      await sendSafeMusicCard(conn, from, track, prompt, musicStyle, mek);

      const audioRes = await axios.get(track.musicFile, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 120000
      });
      await conn.sendMessage(from, {
        audio: Buffer.from(audioRes.data),
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${track.title}.mp3`,
      }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Suno Error:', e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply(`*💥 Suno Error: ${e.message || e} 😔*`);
  } finally {
    if (q) {
      const cleanPrompt = q.replace(/--style\s+[^\s]+/i, '').replace(/--quick/i, '').trim();
      const genKey = `${m.sender}_${cleanPrompt}_${isQuick? 'quick' : musicStyle}`;
      activeGenerations.delete(genKey);
    }
  }
});