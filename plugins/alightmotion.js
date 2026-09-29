const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API1 = 'https://api.omegatech.app/api/tools/Alightmotion-Prem-gen';
const API2 = 'https://api.omegatech.app/api/tools/Alightmotion-Prem-gen2';

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

cmd({
  pattern: "alightmotion",
  alias: ["alight", "amgen", "amprem", "alightgen", "alightprem", "amgen2"],
  react: "🎨",
  desc: "Generate Alight Motion premium accounts - gen1 (temp email) & gen2 (EmailTick full body + inbox)",
  category: "progresstech tools",
  use: ".alightmotion |.alightmotion gen2 5 |.alightmotion bulk 5",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = q || "";
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
        try { const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson); if (p.id) rawQ = p.id.replace(prefix,"").trim(); } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z0-9-]+\\s*`, 'i'), '').trim();

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: NEWSLETTER_JID, serverMessageId: 1, newsletterName: '🥷TECH TOY🧑‍💻™ ✓' }
    };

    // Parse: gen1 / gen2 / bulk / inbox
    let version = 2; // default gen2 is better (full body)
    let count = 1;
    let action = "generate";

    const low = rawQ.toLowerCase();
    if (low.includes('gen1') || low.includes('v1') || low === '1') version = 1;
    if (low.includes('gen2') || low.includes('v2') || low === '2') version = 2;
    if (low.includes('inbox') || low.includes('read') || low.includes('mail')) action = "inbox";

    const countMatch = rawQ.match(/(\d+)/);
    if (countMatch) count = Math.min(parseInt(countMatch[1]), 10);

    if (low.includes('bulk')) count = count || 5;

    if (!rawQ || ['help','menu'].includes(low) || low.startsWith('help')) {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) { const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer }); thumb = media.imageMessage; }
        } catch {}

        const menu = `┏━━〔 🎨 Alight Motion Prem 〕━━┓
┃ Generate premium accounts
┃ 73 tools endpoints
┃
┃ *Gen1:* Temp email + Firebase
┃ Single & bulk support
┃ *Gen2:* EmailTick - full body
┃ Reads activation link reliably
┃ Also inbox reading
┃
┃ *Usage:*
┃ ${prefix}alightmotion - gen2 (best)
┃ ${prefix}alightmotion gen1 - old method
┃ ${prefix}alightmotion gen2 5 - bulk 5
┃ ${prefix}alightmotion bulk 5
┃ ${prefix}alightmotion gen2 inbox
┗━━━━━━━━━━━━━━┛
`;
        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎨 Gen2 Best", id: `${prefix}alightmotion gen2` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎨 Gen1", id: `${prefix}alightmotion gen1` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎨 Bulk 5 (Gen2)", id: `${prefix}alightmotion gen2 5` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🎨 Alight Motion Prem Gen", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu }, footer: { text: BRAND }, nativeFlowMessage: { buttons }
            }, contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });

    const apiUrl = version === 1? API1 : API2;
    const methodName = version === 1? 'Gen1 Temp+Firebase' : 'Gen2 EmailTick Full Body';

    reply(`*🎨 Generating Alight Motion Premium...*\n*Method:* ${methodName}\n*Count:* ${count}\n*Action:* ${action}\n\n_Wait 15-60 sec per account, extracting activation link..._\n\n_${BRAND}_`);

    let results = [];

    // If inbox reading
    if (action === 'inbox') {
        try {
            const { data } = await axios.get(`${apiUrl}?action=inbox&read=true&inbox=true`, { timeout: 60000 });
            const inboxData = data.data || data;
            let txt = `*📧 Inbox Data:*\n\n${JSON.stringify(inboxData, null, 2).slice(0,3500)}\n\n${BRAND}`;
            return await conn.sendMessage(from, { text: txt, contextInfo: ctx }, { quoted: mek });
        } catch (e) {
            // Try POST
            try {
                const { data } = await axios.post(apiUrl, { action: "inbox", read: true }, { timeout: 60000, headers: { 'Content-Type': 'application/json' } });
                return await conn.sendMessage(from, { text: `*📧 Inbox:*\n${JSON.stringify(data.data || data, null,2).slice(0,3500)}\n\n${BRAND}`, contextInfo: ctx }, { quoted: mek });
            } catch (e2) { throw new Error(`Inbox read failed: ${e2.message}`); }
        }
    }

    // Generate loop
    for (let i=0;i<count;i++) {
        try {
            let accData = null;

            // Try POST with count param
            try {
                const { data } = await axios.post(apiUrl, {
                    count: 1,
                    bulk: count > 1? true : false,
                    quantity: 1,
                    generate: true
                }, { timeout: 90000, headers: { 'Content-Type': 'application/json' } });
                accData = data.data || data;
            } catch {
                // GET fallback
                const { data } = await axios.get(`${apiUrl}?count=1&generate=true&bulk=${count>1}`, { timeout: 90000 });
                accData = data.data || data;
            }

            // Normalize result
            let email = accData.email || accData.data?.email || accData.account?.email || "N/A";
            let pass = accData.password || accData.pass || accData.data?.password || accData.account?.password || "N/A";
            let link = accData.activation_link || accData.activationLink || accData.link || accData.data?.activation_link || accData.data?.link || accData.data?.url || accData.url || "";
            let raw = typeof accData === 'object'? JSON.stringify(accData).slice(0,1000) : accData;

            // If bulk returns array
            if (Array.isArray(accData)) accData = accData[0];
            if (Array.isArray(accData.data)) accData = accData.data[0];

            results.push({ email, pass, link, raw: accData });

            if (count > 1) {
                await conn.sendMessage(from, {
                    text: `*🎨 [${i+1}/${count}] Generated:*\n📧 Email: ${email}\n🔑 Pass: ${pass}\n🔗 Link: ${link || 'Check inbox'}\n\n_${BRAND}_`,
                    contextInfo: ctx
                }, { quoted: mek });
                await new Promise(r=>setTimeout(r, 2000));
            }

        } catch (e) {
            console.log(`Gen ${i+1} failed`, e.response?.data || e.message);
            results.push({ error: e.message });
        }
    }

    if (results.length === 0) throw new Error('No account generated');

    // Single result nice formatting
    if (count === 1) {
        const r = results[0];
        if (r.error) throw new Error(r.error);

        let caption = `*✅ Alight Motion Premium Generated*\n*Method:* ${methodName}\n\n`;
        caption += `📧 *Email:* ${r.email}\n🔑 *Password:* ${r.pass}\n`;
        if (r.link) caption += `🔗 *Activation:* ${r.link}\n`;
        caption += `\n*Instructions:*\n1. Login with email/pass in Alight Motion\n2. If activation link, open it to verify\n3. Enjoy Premium\n\n*${BRAND}*\n${CHANNEL_LINK}`;

        await conn.sendMessage(from, { text: caption, contextInfo: ctx }, { quoted: mek });

        // Also save as file
        const txtFile = `ALIGHT MOTION PREMIUM - ${methodName}\nGenerated: ${new Date().toLocaleString()}\n\nEmail: ${r.email}\nPassword: ${r.pass}\nActivation: ${r.link || 'N/A'}\n\nFull Data:\n${JSON.stringify(r.raw, null, 2)}\n\n${BRAND}`;
        await conn.sendMessage(from, {
            document: Buffer.from(txtFile),
            mimetype: 'text/plain',
            fileName: `AlightMotion_Prem_${Date.now()}.txt`,
            caption: `*💾 Account File*\n${BRAND}`,
            contextInfo: ctx
        }, { quoted: mek });

    } else {
        let bulkTxt = `ALIGHT MOTION PREMIUM BULK - ${count} Accounts - ${methodName}\nGenerated: ${new Date().toLocaleString()}\n\n`;
        results.forEach((r,i)=>{
            bulkTxt += `--- ACCOUNT ${i+1} ---\nEmail: ${r.email || 'ERROR'}\nPass: ${r.pass || r.error}\nLink: ${r.link || 'N/A'}\n\n`;
        });
        bulkTxt += `\n${BRAND}\n${CHANNEL_LINK}`;

        await conn.sendMessage(from, {
            document: Buffer.from(bulkTxt),
            mimetype: 'text/plain',
            fileName: `AlightMotion_Bulk_${count}_${Date.now()}.txt`,
            caption: `*✅ Bulk ${count} Accounts Generated*\n*Method:* ${methodName}\n\n*${BRAND}*`,
            contextInfo: ctx
        }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Alight Error:', e.response?.data || e.message);
    reply(`*❌ Alight Gen Failed*\n${e.response?.data?.message || e.message}\n\nTry: ${'.alightmotion gen1'} or ${'.alightmotion gen2'}`);
  }
});