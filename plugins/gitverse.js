const { cmd } = require('../redx');
const axios = require('axios');

cmd({
  pattern: "gitverse",
  alias: ["gitprompt", "repo2prompt", "scrapegh"],
  react: "🎯",
  desc: "Get AI prompt that built any GitHub repo",
  category: "tools",
  use: ".gitverse https://github.com/Omegatech-01/E-Stream",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    if (!q) return reply(`*⚠️ GITVERSE SCRAPER 👑*\n\n*Provide GitHub repo URL*\n\n*Example: ${prefix}gitverse https://github.com/Omegatech-01/E-Stream*`);

    const urlMatch = q.match(/(https?:\/\/[^\s]+)/i);
    if (!urlMatch) return reply(`*❌ Invalid URL*`);
    
    const repoUrl = urlMatch[0];
    if (!repoUrl.includes('github.com')) return reply(`*❌ Please provide valid GitHub URL*`);

    reply(`*🔄 Extracting prompt from repo...*\n*📦 ${repoUrl}*`);

    const apiUrl = `https://omegatech-api.dixonomega.tech/api/tools/gitverse?action=scrape&repo=${encodeURIComponent(repoUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    if (!data.success) throw new Error('Failed to scrape repo');

    const prompt = data.data?.prompt || data.data?.raw?.prompt || 'No prompt found';
    const timestamp = new Date(data.timestamp).toLocaleString();

    let msg = `*🎯 GITVERSE SUCCESS 👑*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*📦 Repo:* ${data.data.repo}\n`;
    msg += `*🕐 Time:* ${timestamp}\n`;
    msg += `*🔹 Source:* ${data.source}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*📝 EXTRACTED PROMPT:*\n\n${prompt}\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*💡 Vidcoding getting more easier*`;

    reply(msg);

  } catch (e) {
    console.error('Gitverse Error:', e);
    let err = `*❌ Failed to extract prompt*\n\n`;
    if (e.response) err += `*Status: ${e.response.status} - ${e.response.data?.message || 'Unknown'}*`;
    else err += `*Error: ${e.message}*`;
    reply(err);
  }
});