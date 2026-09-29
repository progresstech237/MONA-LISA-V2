const { cmd } = require('../redx');
const axios = require('axios');
const crypto = require('crypto');

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/di2a9lenz/image/upload/v1786909227/omegatech_ai_media/upload-1786909226872.jpg';

// temp storage
let sportsDB = { news: {}, feeds: {}, highlights: {} };

async function getTrendingNews(page = 1, perPage = 5) {
    const url = `https://api.omegatech.app/api/Sport/sport-trend?page=${page}&perPage=${perPage}`;
    const { data } = await axios.get(url, { timeout: 30000 });
    if (!data.success &&!data.news) throw new Error('Failed to fetch news');
    return data;
}

async function getSportFeeds() {
    const url = `https://api.omegatech.app/api/Sport/sport-feeds`;
    const { data } = await axios.get(url, { timeout: 30000 });
    if (!data.success &&!data.matches) throw new Error('Failed to fetch feeds');
    return data;
}

async function sendRichResponse(conn, chatId, title, content, imageUrl, quoted) {
    try {
        // Clean version without hardcoded groupId - uses your current conn
        const responseId = crypto.randomUUID();
        const responseData = {
            "response_id": responseId,
            "sections": [
                {
                    "view_model": {
                        "primitive": {
                            "title": title,
                            "brand": "Progress Tech Sports",
                            "price": "⚽",
                            "product_url": "https://wa.me/237682432296",
                            "image": { "url": imageUrl || CLOUDINARY_IMAGE, "mime_type": "image/jpeg" },
                            "additional_images": [],
                            "__typename": "GenAIProductItemCardPrimitive"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                    },
                    "__typename": "GenAIUnifiedResponseSection"
                },
                {
                    "view_model": {
                        "primitive": {
                            "text": content,
                            "__typename": "GenAIMarkdownTextUXPrimitive"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                    },
                    "__typename": "GenAIUnifiedResponseSection"
                }
            ]
        };

        await conn.sendMessage(chatId, {
            text: content,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "Progress Tech Sports",
                    thumbnailUrl: imageUrl || CLOUDINARY_IMAGE,
                    sourceUrl: "https://wa.me/237682432296",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted });

        return true;
    } catch (e) {
        console.log('Rich error:', e.message);
        try {
            await conn.sendMessage(chatId, {
                image: { url: imageUrl || CLOUDINARY_IMAGE },
                caption: `*${title}*\n\n${content}`
            }, { quoted });
            return true;
        } catch {
            return false;
        }
    }
}

// Auto clean DB every 30 min to prevent memory leak
setInterval(() => {
    sportsDB = { news: {}, feeds: {}, highlights: {} };
}, 30 * 60 * 1000);

cmd({
  pattern: "sports",
  alias: ["sport", "soccer"],
  react: "⚽",
  desc: "Get sports news, match results, and highlights",
  category: "news",
  use: ".sports |.sports trends |.sports feeds |.sports highlights",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const args = q? q.split(' ') : [];
    const subCommand = args[0]?.toLowerCase() || '';
    const page = parseInt(args[1]) || 1;

    if (subCommand === 'highlight' && args[1]!== undefined) {
        const idx = parseInt(args[1]);
        const hData = sportsDB.highlights?.[m.sender];
        if (!hData) return reply(`*⚠️ No highlights found. Please run ${prefix}sports highlights first.*`);
        const selected = hData.highlights[idx];
        if (!selected) return reply(`*❌ Invalid highlight selection.*`);
        const videoUrl = selected.videoUrl || selected.path || selected.url || '';
        if (!videoUrl) return reply(`*❌ Video URL not found.*`);
        reply(`*📤 Sending highlight: ${selected.title || 'Clip'}...*`);
        try {
            await conn.sendMessage(from, { video: { url: videoUrl }, caption: `*🎬 ${selected.title || 'Match Highlight'}*` }, { quoted: mek });
        } catch {
            reply(`*📺 Watch here: ${videoUrl}*`);
        }
        return;
    }

    if (subCommand === 'news' && args[1]!== undefined) {
        const idx = parseInt(args[1]);
        const newsData = sportsDB.news?.[m.sender];
        if (!newsData) return reply(`*⚠️ No news found. Please run ${prefix}sports trends first.*`);
        const selected = newsData.news[idx];
        if (!selected) return reply(`*❌ Invalid news selection.*`);
        const date = selected.createdAt? new Date(parseInt(selected.createdAt)).toLocaleString() : 'N/A';
        const coverUrl = selected.cover?.url || selected.thumbnail || CLOUDINARY_IMAGE;
        const content = `*📰 ${selected.title}*\n━━━━━━━━━━━━━━━\n*📝 ${selected.summary || 'No summary.'}*\n\n*📅 ${date}*\n*🔗 ${selected.detailPath || 'N/A'}*`;
        await sendRichResponse(conn, from, '📰 Sports News', content, coverUrl, mek);
        return;
    }

    if (subCommand === 'match' && args[1]!== undefined) {
        const idx = parseInt(args[1]);
        const feedsData = sportsDB.feeds?.[m.sender];
        if (!feedsData) return reply(`*⚠️ No matches found. Please run ${prefix}sports feeds first.*`);
        const selected = feedsData.matches[idx];
        if (!selected) return reply(`*❌ Invalid match selection.*`);
        let content = `*⚽ ${selected.team1?.name || 'Team1'} vs ${selected.team2?.name || 'Team2'}*\n━━━━━━━━━━━━━━━\n*📊 Score: ${selected.team1?.score || '0'} - ${selected.team2?.score || '0'}*\n*🏆 League: ${selected.league || 'N/A'}*\n*📌 Status: ${selected.status || 'Unknown'}*\n`;
        if (selected.replay?.length) content += `\n*📺 Full Replay:*\n${selected.replay[0].path || selected.replay[0].url}\n`;
        if (selected.highlights?.length) {
            content += `\n*🎬 Highlights:*\n`;
            selected.highlights.forEach((h,i)=>{ content += `${i+1}. ${h.title || 'Clip'}\n`; });
            content += `\n*💡 Use ${prefix}sports highlight <number> to watch*`;
        }
        return reply(content);
    }

    if (!q || subCommand === 'menu' || subCommand === 'help') {
        return reply(`*⚽ SPORTS HUB 👑*\n\n*📌 Welcome to Sports Hub!*\n\n*Select an option:*\n\n*📰 ${prefix}sports trends - Latest headlines*\n*⚽ ${prefix}sports feeds - Live results & scores*\n*🎬 ${prefix}sports highlights - Video clips & replays*\n\n*More:*\n*📰 ${prefix}sports trends 2 - Page 2*\n*📰 ${prefix}sports news 0 - Read news #0*\n*⚽ ${prefix}sports match 0 - View match #0*\n*🎬 ${prefix}sports highlight 0 - Watch highlight #0*\n\n*⚡ Powered by Omegatech Sports*`);
    }

    if (subCommand === 'trends' || subCommand === 'trend') {
        const data = await getTrendingNews(page, 5);
        const newsList = data?.news || data?.data?.news || data?.data || [];
        sportsDB.news[m.sender] = { news: newsList, timestamp: Date.now() };
        let msg = `*📰 SPORTS TRENDING NEWS - Page ${data?.page || page} 👑*\n\n*Total: ${data?.totalNews || newsList.length} articles*\n\n`;
        newsList.slice(0,5).forEach((item,i)=>{
            msg += `*${i}. ${item.title?.substring(0,60)}*\n${item.summary?.substring(0,80)}...\n*Read: ${prefix}sports news ${i}*\n\n`;
        });
        if (data?.hasMore) msg += `*Next Page: ${prefix}sports trends ${parseInt(data?.page || page)+1}*\n`;
        return reply(msg);
    }

    if (subCommand === 'feeds' || subCommand === 'feed' || subCommand === 'matches') {
        const data = await getSportFeeds();
        const matches = data?.matches || data?.data?.matches || data?.data || [];
        sportsDB.feeds[m.sender] = { matches: matches, timestamp: Date.now() };
        let msg = `*⚽ MATCH FEEDS - ${matches.length} matches 👑*\n\n`;
        matches.slice(0,5).forEach((match,i)=>{
            msg += `*${i}. ${match?.team1?.name || 'Team1'} vs ${match?.team2?.name || 'Team2'}*\n*Score: ${match?.team1?.score || '0'} - ${match?.team2?.score || '0'} • ${match?.league || 'N/A'}*\n*View: ${prefix}sports match ${i}*\n\n`;
        });
        return reply(msg);
    }

    if (subCommand === 'highlights' || subCommand === 'hl' || subCommand === 'replay') {
        const data = await getSportFeeds();
        const matches = data?.matches || data?.data?.matches || data?.data || [];
        const allHighlights = [];
        for (const match of matches) {
            const highlights = match?.highlights || match?.videos || [];
            highlights.forEach(h=>{
                allHighlights.push({...h, matchTitle: `${match?.team1?.name || 'Team1'} vs ${match?.team2?.name || 'Team2'}`, videoUrl: h?.path || h?.url || h?.videoUrl || h?.src || '' });
            });
        }
        if (allHighlights.length===0) return reply(`*⚠️ No highlights available.*`);
        sportsDB.highlights[m.sender] = { highlights: allHighlights, timestamp: Date.now() };
        let msg = `*🎬 MATCH HIGHLIGHTS - ${allHighlights.length} clips 👑*\n\n`;
        allHighlights.slice(0,10).forEach((h,i)=>{
            msg += `*${i}. ${h.title || h.matchTitle}*\n*Watch: ${prefix}sports highlight ${i}*\n\n`;
        });
        return reply(msg);
    }

    reply(`*⚠️ Unknown option. Use ${prefix}sports menu*`);

  } catch (e) {
    console.error('Sports error:', e);
    reply(`*❌ Error: ${e.message || 'Unknown error'}*`);
  }
});