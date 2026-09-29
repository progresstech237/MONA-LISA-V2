const { cmd } = require('../redx');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
wrapper(axios);

class IQIYIScraper {
  constructor() {
    this.deviceId = '8936806dac3e27d0daf95979310002f6';
    this.jar = new CookieJar();
    this.client = axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.iq.com/',
        'Origin': 'https://www.iq.com'
      }
    });
  }
  _generateSid() { return `${this.deviceId}_${Date.now()}`; }

  async getHotVideos(options = {}) {
    const base = 'https://pcw-api.iq.com/api/lego/hot';
    const params = { platformId: 4, modeCode: 'intl', langCode: 'en_us', deviceId: this.deviceId, uid: '', ua: 'mozilla/5.0 (linux; android 10; k) applewebkit/537.36 (khtml, like gecko) chrome/139.0.0.0 mobile safari/537.36', sid: this._generateSid(), channelId: 0, size: 10, vip: 0, pspStatus: 1,...options };
    const url = new URL(base); Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
    const { data } = await this.client.get(url.toString());
    if (data.code!== '0') throw new Error(`Hot API error: ${data.code}`);
    return data.data.map(v => ({
      title: v.name || v.focus || 'No title',
      rating: v.rating || '',
      desc: v.desc || '',
      poster: v.albumWebpPic || v.posterWebpPic || '',
      totalEpisodes: v.tvCount || 0,
      albumId: v.qipuId || null,
      tvId: v.defaultTvId || null,
      webPlayUrl: v.playLocSuffix? `https://www.iq.com/play/${v.playLocSuffix}` : null,
      webAlbumUrl: v.albumLocSuffix? `https://www.iq.com/album/${v.albumLocSuffix}` : null,
      initIssueTime: v.initIssueTime || ''
    }));
  }

  async getHotVideosWithStream() {
    try {
      const { YtDlp } = require('ytdlp-nodejs');
      const ytdlp = new YtDlp();
      const videos = await this.getHotVideos({ size: 10 });
      for (let v of videos) {
        if (v.webPlayUrl) {
          try {
            const info = await ytdlp.getInfoAsync(v.webPlayUrl);
            const best = (info.formats || []).filter(f=>f.has_video && f.has_audio).sort((a,b)=>(b.height||0)-(a.height||0))[0];
            if (best) { v.streamUrl = best.url; v.streamQuality = best.height; }
          } catch {}
        }
      }
      return videos;
    } catch {
      return await this.getHotVideos({ size: 10 });
    }
  }

  async searchViaAPI(query) {
    // API search fallback using web search endpoint
    const url = `https://pcw-api.iq.com/api/search/recommend?query=${encodeURIComponent(query)}&page=1&size=10&platformId=4&modeCode=intl&langCode=en_us&deviceId=${this.deviceId}`;
    const { data } = await axios.get(url);
    return data;
  }
}

let iqCache = {};

async function prepareImage(conn, url) {
    try {
        const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
        const resp = await axios.get(url, { responseType: 'arraybuffer' });
        const media = await prepareWAMessageMedia({ image: Buffer.from(resp.data) }, { upload: conn.waUploadToServer });
        return media.imageMessage;
    } catch { return null; }
}

cmd({
  pattern: "iqiyi",
  alias: ["iq", "iqsearch"],
  react: "🎬",
  desc: "Search and get IQIYI videos - hot, search, info",
  category: "downloader",
  use: ".iqiyi hot |.iqiyi search naruto |.iqiyi info <url> |.iqiyi stream 0",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const scraper = new IQIYIScraper();
    const args = q? q.split(' ') : [];
    const sub = args[0]?.toLowerCase() || 'help';
    const query = args.slice(1).join(' ');

    if (!q || sub === 'help' || sub === 'menu') {
        return reply(`*🎬 IQIYI SCRAPER 👑*\n\n*Commands:*\n*👑 ${prefix}iqiyi hot - Get hot videos 👑*\n*👑 ${prefix}iqiyi search <query> - Search videos 👑*\n*👑 ${prefix}iqiyi info <url> - Get video info 👑*\n*👑 ${prefix}iqiyi stream 0 - Get stream link 👑*\n\n*⚡ Powered by Omegatech*\n*Disclaimer: For educational use only*`);
    }

    if (sub === 'hot') {
        reply(`*🔥 Fetching hot videos...*`);
        const videos = await scraper.getHotVideos({ size: 10 });
        iqCache[m.sender] = { videos, timestamp: Date.now() };
        const imageMessage = await prepareImage(conn, videos[0]?.poster);
        const rows = videos.map((v,i)=>({ id: `${prefix}iqiyi stream ${i}`, title: (v.title || `Video ${i+1}`).substring(0,35), description: `${v.rating || ''} • ${v.totalEpisodes} eps`.substring(0,50) }));
        const buttons = [{ name: "single_select", buttonParamsJson: JSON.stringify({ title: "🔥 Hot Videos", sections: [{ title: "Hot on IQIYI", highlight_label: "🎬", rows: rows.slice(0,10) }] }) }];
        const interactiveMsg = {
            interactiveMessage: { header: { title: "🔥 IQIYI Hot Videos", hasMediaAttachment:!!imageMessage,...(imageMessage? { imageMessage } : {}) }, body: { text: `*Found ${videos.length} hot videos*\nSelect to get stream URL:` }, footer: { text: "🔹 IQIYI Scraper • Educational use" }, nativeFlowMessage: { buttons } }
        };
        await conn.relayMessage(from, interactiveMsg, { additionalNodes: [{ tag: "biz", attrs: {}, content: [{ tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }] }] }] });
        return;
    }

    if (sub === 'search') {
        if (!query) return reply(`*❌ Provide query: ${prefix}iqiyi search naruto*`);
        reply(`*🔍 Searching IQIYI for: ${query}...*`);
        try {
            const { YtDlp } = require('ytdlp-nodejs');
            const ytdlp = new YtDlp();
            const searchUrl = `https://www.iq.com/search?query=${encodeURIComponent(query)}`;
            const info = await ytdlp.getInfoAsync(searchUrl, { dumpSingleJson: true, flatPlaylist: true });
            const entries = (info.entries || []).slice(0,10).map(e=>({ title: e.title, url: e.url, duration: e.duration, uploader: e.uploader, thumbnail: e.thumbnail }));
            if (!entries.length) return reply(`*❌ No results for ${query}*`);
            iqCache[m.sender] = { videos: entries, timestamp: Date.now() };
            let msg = `*🔍 Results for ${query} - ${entries.length} found 👑*\n\n`;
            entries.forEach((v,i)=>{ msg+=`*${i}. ${v.title}*\n*URL: ${v.url}*\n*Stream: ${prefix}iqiyi stream ${i}*\n\n`; });
            return reply(msg);
        } catch (e) {
            const apiRes = await scraper.searchViaAPI(query).catch(()=>null);
            return reply(`*🔍 Search done for ${query}*\n*Result:*\n\`\`\`${JSON.stringify(apiRes||e.message).slice(0,2000)}\`\`\``);
        }
    }

    if (sub === 'stream') {
        const idx = parseInt(args[1]);
        const cache = iqCache[m.sender];
        if (!cache) return reply(`*⚠️ No cache. Run ${prefix}iqiyi hot or search first*`);
        const video = cache.videos[idx];
        if (!video) return reply(`*❌ Invalid index*`);
        const playUrl = video.webPlayUrl || video.url;
        if (!playUrl) return reply(`*❌ No playable URL for this video*`);
        reply(`*⏳ Fetching stream for ${video.title}...*`);
        try {
            const { YtDlp } = require('ytdlp-nodejs');
            const ytdlp = new YtDlp();
            const info = await ytdlp.getInfoAsync(playUrl);
            const best = (info.formats||[]).filter(f=>f.has_video && f.has_audio).sort((a,b)=>(b.height||0)-(a.height||0))[0];
            let txt = `*🎬 ${info.title || video.title}*\n━━━━━━━━━━━━━━━\n*⏱️ Duration: ${info.duration || video.duration || 'N/A'}s*\n*👤 Uploader: ${info.uploader || 'IQIYI'}*\n*👁️ Views: ${info.view_count || 'N/A'}*\n\n`;
            if (best) txt+=`*✅ Best Quality: ${best.height}p*\n*🔗 Stream URL:*\n${best.url}\n\n*All formats: ${info.formats.length}*\n`;
            else txt+=`*❌ No stream URL found*\n`;
            reply(txt);
        } catch (e) { reply(`*❌ Stream error: ${e.message}*`); }
        return;
    }

    if (sub === 'info') {
        const url = args[1];
        if (!url) return reply(`*❌ Provide URL: ${prefix}iqiyi info https://www.iq.com/play/...*`);
        reply(`*📺 Getting info for ${url}...*`);
        try {
            const { YtDlp } = require('ytdlp-nodejs');
            const ytdlp = new YtDlp();
            const info = await ytdlp.getInfoAsync(url);
            let txt = `*🎬 ${info.title}*\n━━━━━━━━━━━━━━━\n*⏱️ Duration: ${info.duration}s*\n*👤 Uploader: ${info.uploader}*\n*📅 Date: ${info.upload_date}*\n*👁️ Views: ${info.view_count}*\n*👍 Likes: ${info.like_count}*\n*📝 Desc: ${info.description?.slice(0,200)}...*\n*🎞️ Formats: ${info.formats?.length}*\n`;
            reply(txt);
        } catch (e) { reply(`*❌ Info error: ${e.message}*`); }
        return;
    }

    reply(`*⚠️ Unknown option. Use ${prefix}iqiyi menu*`);

  } catch (e) {
    console.error('IQIYI error:', e);
    reply(`*❌ Error: ${e.message}*`);
  }
});