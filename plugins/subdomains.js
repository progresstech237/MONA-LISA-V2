const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/subdomain-finder';

cmd({
  pattern: "subdomain",
  alias: ["subfinder", "subdomains", "findsub", "subs"],
  react: "🌐",
  desc: "Find subdomains for a domain - /api/tools/subdomain-finder",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *🌐 SUBDOMAIN FINDER - LIVE ✅* ─
│ Find all subdomains + IP + CF
│
├─ *📌 USAGE*
│.subdomain progress.com
│.subdomain example.com
│.subdomain google.com
│.subdomain dixonomega.tech
│
├─ *🔥 YOUR EXAMPLE*
│.subdomain progress.com
│ → 600+ subs:
│ api.progress.com
│ vpn.progress.com
│ www.progress.com
│ pr108.mft.progress.com... pr299
│ mail.progress.com
│ docs.progress.com
│
├─ *⚙️ RETURNS*
│ subdomain, ip, cloudflare boolean
│
╰─ Endpoint: /api/tools/subdomain-finder`
      );
    }

    let domain = q.trim().split(/\s+/)[0].replace(/^https?:\/\//,'').replace(/\/.*$/,'');
    if (!domain.includes('.')) return reply('❌ Need valid domain\nEx:.subdomain progress.com');

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);
    await reply(`🔍 Scanning subdomains for *${domain}*...`);

    const { data } = await axios.get(API, {
      params: { domain, url: domain, target: domain, q: domain },
      timeout: 60000
    });

    const results = data?.result || data?.data || data?.subdomains || [];
    if (!Array.isArray(results) || results.length === 0) {
      return reply(`⚠️ No subdomains found or raw: ${JSON.stringify(data).slice(0,1000)}`);
    }

    let cfCount = results.filter(r=>r.cloudflare).length;
    let msg = `*🌐 SUBDOMAIN FINDER - ${domain} ✅*\n`;
    msg += `*Found:* ${results.length} subdomains\n`;
    msg += `*Cloudflare:* ${cfCount} protected | ${results.length-cfCount} exposed\n\n`;

    // Top 30
    results.slice(0, 30).forEach((r,i)=>{
      const cf = r.cloudflare? '☁️ CF' : '🌍';
      const ip = r.ip && r.ip!=='N/A'? ` [${r.ip}]` : '';
      msg += `${i+1}. ${r.subdomain}${ip} ${cf}\n`;
    });

    if (results.length > 30) {
      msg += `\n... +${results.length-30} more subdomains\n`;
      // Send full list as file
      let full = `Subdomains for ${domain} - Found ${results.length}\n\n`;
      results.forEach(r=>{ full+=`${r.subdomain} | IP: ${r.ip} | CF: ${r.cloudflare}\n`; });
      await conn.sendMessage(from, { document: Buffer.from(full), mimetype: 'text/plain', fileName: `subdomains-${domain}.txt`, caption: `*Full ${results.length} subdomains for ${domain}*` }, { quoted: mek });
    }

    msg += `\n> @Omegatech-01 • Recon tool`;
    await conn.sendMessage(from, { text: msg }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Subfinder error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.response?.data?.message || e.message}\n\nTry:.subdomain progress.com`);
  }
});
