const { cmd } = require('../redx');
const axios = require('axios');

cmd({
  pattern: "apk",
  alias: ["app", "playstore", "application"],
  react: "☺️",
  desc: "Download APK via Aptoide",
  category: "download",
  use: ".apk <name>",
  filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    if (!q) return reply("*YOU WANT TO DOWNLOAD AN APK 🤔*\n*THEN WRITE LIKE THIS ☺️*\n\n*APK ❮APK NAME❯*\n\n*WHEN YOU WRITE LIKE THIS 🤗 YOUR APK WILL BE DOWNLOADED 😃 AND SENT HERE 😍🌹*");

    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=1`;
    const { data } = await axios.get(apiUrl);

    if (!data || !data.datalist || !data.datalist.list.length) {
      return reply("*APK NOT FOUND 😔*");
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2);

    let caption = `*╭━━━〔 👑 APK INFO 👑 〕━━━┈⊷*
*┃ 👑 NAME: ${app.name.toUpperCase()}*
*┃ 👑 SIZE :❯ ${appSize} MB*
*┃ 👑 PACK :❯ ${app.package.toUpperCase()}*
*┃ 👑 VER :❯ ${app.file.vername}*
*╰━━━━━━━━━━━━━━━┈⊷*

*👑 BY :❯ *🥰𝑴𝑶𝑵𝑨 𝑳𝑰𝑺𝑨🤭* MINI BOT 👑*`;

    await conn.sendMessage(from, { image: { url: app.icon }, caption }, { quoted: mek });

    await conn.sendMessage(from, {
      document: { url: app.file.path || app.file.path_alt },
      mimetype: "application/vnd.android.package-archive",
      fileName: `${app.name.toUpperCase()}.apk`
    }, { quoted: mek });

    await m.react("😍");
  } catch (err) {
    reply("*👑 ERROR :❯* TRY AGAIN!");
  }
});