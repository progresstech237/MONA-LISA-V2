const { cmd } = require('../redx');
const axios = require('axios');

cmd({
  pattern: "webzip",
  alias: ["zipweb"],
  react: "📦",
  desc: "Download any webpage as a ZIP file",
  category: "tools",
  use: ".webzip <url>",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    if (!q) {
        return reply(`*📦 WEB TO ZIP DOWNLOADER 👑*\n\n*Download any webpage as a ZIP file.*\n\n*Usage:*\n*👑 ${prefix}webzip <url> 👑*\n\n*Examples:*\n*👑 ${prefix}webzip https://www.bilibili.tv/en/video/2005655709 👑*\n*👑 ${prefix}webzip https://example.com 👑*\n\n*⚡ Powered by Omegatech*`);
    }

    const urlMatch = q.match(/(https?:\/\/[^\s]+)/i);
    if (!urlMatch) {
        return reply(`*❌ Invalid URL. Please provide a valid URL.*`);
    }

    const url = urlMatch[0];
    reply(`*⏳ Processing webpage: ${url}...*`);

    const apiUrl = `https://api.omegatech.app/api/tools/webtozip?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    if (!data.success) {
        return reply(`*❌ Failed to process webpage. ${data.result?.error?.text || 'Unknown error'}*`);
    }

    const result = data.result;
    const downloadUrl = result.downloadUrl;
    const filesAmount = result.copiedFilesAmount || 0;

    reply(`*📦 Downloading ZIP file... (${filesAmount} files)*`);

    const zipResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 120000
    });

    const zipBuffer = Buffer.from(zipResponse.data);
    const fileName = `webpage_${Date.now()}.zip`;

    await conn.sendMessage(from, {
        document: zipBuffer,
        mimetype: 'application/zip',
        fileName: fileName,
        caption: `*📦 Webpage Downloaded Successfully!*\n━━━━━━━━━━━━━━━━━━━━━\n*🔗 URL:* ${url}\n*📄 Files Copied:* ${filesAmount}\n*📁 File:* ${fileName}\n\n*🔹 Powered by Omegatech*`
    }, { quoted: mek });

  } catch (e) {
    console.error('Web to ZIP error:', e);
    reply(`*❌ Error: ${e.message || 'Unknown error'}*`);
  }
});