const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API = 'https://api.dixonomega.tech/api/ai/Claude-Off';
const SESSION_FILE = path.join(__dirname, '../data/claude-off-sessions.json');

try {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch {}

function loadSessions() {
    try { if (fs.existsSync(SESSION_FILE)) return JSON.parse(fs.readFileSync(SESSION_FILE,'utf8')); } catch {}
    return {};
}
function saveSessions(s) {
    try { fs.writeFileSync(SESSION_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.log(e.message); }
}

let sessions = loadSessions();

// REDX file downloader
async function getFile(m) {
    try {
        let q = m.quoted || m;
        if (!q ||!q.download) return null;
        const buf = await q.download();
        if (!buf || buf.length < 100) return null;
        const mime = q.mimetype || q.msg?.mimetype || 'application/octet-stream';
        const name = q.fileName || q.msg?.fileName || `file.${mime.split('/')[1] || 'bin'}`;
        return { buffer: buf, mimetype: mime, fileName: name };
    } catch { return null; }
}

cmd({
  pattern: "claudeoff",
  alias: ["claude-off", "coff"],
  react: "🟣",
  desc: "Claude Off Official - full client",
  category: "progresstech ai",
  use: ".claudeoff auth email | verify code | chat",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = (q || "").trim();
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z-]+\\s*`, 'i'), '').trim();
    const userKey = m.sender;
    if (!sessions[userKey]) sessions[userKey] = {};

    // ===== AUTH 1: SEND MAGIC LINK =====
    if (rawQ.toLowerCase().startsWith('auth ')) {
        const email = rawQ.slice(5).trim();
        if (!email.includes('@')) return reply(`*❌ Invalid email*\n${prefix}claudeoff auth danielheart12332@gmail.com`);

        await conn.sendMessage(from, { react: { text: "📧", key: mek.key } });
        reply(`*📧 Sending code to ${email}...*`);

        const { data } = await axios.get(API, {
            params: { action: 'send_magic_link', email },
            timeout: 30000
        });

        console.log('send_magic_link:', data);
        if (data.success) {
            sessions[userKey].email = email;
            sessions[userKey].tempSession = data.sessionId || null;
            saveSessions(sessions);
            return reply(`*✅ Code sent!*\nTo: ${email}\n\nCheck inbox (code like 698830)\nThen:\n${prefix}claudeoff verify 698830`);
        } else {
            return reply(`*❌ Failed:* ${JSON.stringify(data).slice(0,1000)}`);
        }
    }

    // ===== AUTH 2: VERIFY CODE =====
    if (rawQ.toLowerCase().startsWith('verify ')) {
        const code = rawQ.slice(7).trim();
        const email = sessions[userKey]?.email;
        if (!email) return reply(`*❌ No email.* Do ${prefix}claudeoff auth your@gmail.com first`);
        if (!/^\d{6}$/.test(code)) return reply(`*❌ Code must be 6 digits.* Example: ${prefix}claudeoff verify 698830`);

        reply(`*🔐 Verifying ${code} for ${email}...*`);

        const { data } = await axios.get(API, {
            params: { action: 'verify_magic_link', email, code },
            timeout: 30000
        });

        console.log('verify_magic_link:', data);
        const sessionId = data.sessionId || data.data?.sessionId;

        if (sessionId) {
            sessions[userKey] = {
                email,
                sessionId,
                verified: true,
                created: Date.now(),
                conversations: []
            };
            saveSessions(sessions);
            return reply(`*✅ VERIFIED!*\nSessionID: ${sessionId.slice(0,20)}...\n\nNow you can:\n${prefix}claudeoff hello\n${prefix}claudeoff what is quantum?`);
        } else {
            return reply(`*❌ Verify failed:* ${JSON.stringify(data).slice(0,1000)}\nCode expired? Do auth again.`);
        }
    }

    // ===== LOGOUT =====
    if (['logout','clear','reset'].includes(rawQ.toLowerCase())) {
        if (sessions[userKey]?.sessionId) {
            try {
                await axios.get(API, { params: { action: 'logout', sessionId: sessions[userKey].sessionId }, timeout: 10000 });
            } catch {}
        }
        delete sessions[userKey];
        saveSessions(sessions);
        return reply(`*✅ Logged out and session ended*`);
    }

    // ===== LIST CONVERSATIONS =====
    if (rawQ.toLowerCase() === 'get_conversations' || rawQ.toLowerCase() === 'list') {
        const sess = sessions[userKey];
        if (!sess?.sessionId) return reply(`*❌ Not authed.* ${prefix}claudeoff auth email`);

        const { data } = await axios.get(API, { params: { action: 'get_conversations', sessionId: sess.sessionId }, timeout: 30000 });
        const list = data.conversations || data.data || [];
        if (!list.length) return reply(`*No conversations yet.*\nStart with ${prefix}claudeoff hello`);
        let txt = `*🟣 Your Conversations:*\n\n`;
        list.slice(0,10).forEach((c,i) => {
            txt += `${i+1}. ${c.title || c.id?.slice(0,8)} - ${c.id}\n`;
        });
        return reply(txt);
    }

    // ===== CHECK AUTH FOR CHAT =====
    if (!rawQ) {
        const s = sessions[userKey];
        const status = s?.verified? `✅ Verified as ${s.email}\nSession: ${s.sessionId.slice(0,15)}...` : s?.email? `⏳ Code sent to ${s.email}\nDo ${prefix}claudeoff verify <code>` : '❌ Not authed';
        return reply(`*🟣 Claude-Off Official*\n\n${status}\n\n*Setup:*\n${prefix}claudeoff auth your@gmail.com\n${prefix}claudeoff verify 698830\n\n*Usage:*\n${prefix}claudeoff hello\n${prefix}claudeoff continue_chat <convoId> hello again\n${prefix}claudeoff get_conversations\nReply to PDF + ${prefix}claudeoff summarize this\n${prefix}claudeoff logout`);
    }

    const sess = sessions[userKey];
    if (!sess?.sessionId) return reply(`*❌ Not authenticated.*\n1. ${prefix}claudeoff auth danielheart12332@gmail.com\n2. Check email code\n3. ${prefix}claudeoff verify 698830`);

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

    // ===== FILE UPLOAD MODE =====
    const fileData = await getFile(m);
    if (fileData) {
        reply(`*📎 File detected: ${fileData.fileName} (${(fileData.buffer.length/1024).toFixed(0)}KB)*\nUploading to Claude...`);

        // First need a conversationId - create one if not exist
        let convoId = sess.lastConversationId;
        if (!convoId) {
            const createRes = await axios.get(API, { params: { action: 'create_conversation', sessionId: sess.sessionId }, timeout: 30000 });
            convoId = createRes.data.conversationId || createRes.data.id || createRes.data.conversation_id;
            if (convoId) {
                sess.lastConversationId = convoId;
                saveSessions(sessions);
            }
        }

        if (!convoId) return reply(`*❌ Could not create conversation for upload*`);

        // Upload file via multipart
        const form = new FormData();
        form.append('file', fileData.buffer, { filename: fileData.fileName, contentType: fileData.mimetype });
        form.append('action', 'upload_file');
        form.append('sessionId', sess.sessionId);
        form.append('conversationId', convoId);

        const uploadRes = await axios.post(API, form, { headers: form.getHeaders(), timeout: 60000 });
        console.log('upload_file:', uploadRes.data);

        // Now chat with file context
        const chatRes = await axios.get(API, {
            params: { action: 'continue_chat', sessionId: sess.sessionId, conversationId: convoId, prompt: rawQ || 'Analyze this file' },
            timeout: 90000
        });

        const answer = chatRes.data.response || chatRes.data.message || JSON.stringify(chatRes.data).slice(0,3000);
        return await conn.sendMessage(from, { text: `*🟣 Claude-Off [File]*\n\n${answer}` }, { quoted: mek });
    }

    // ===== NORMAL CHAT (create new conversation + send message) =====
    // If rawQ starts with continue_chat
    if (rawQ.toLowerCase().startsWith('continue_chat ')) {
        const parts = rawQ.split(' ');
        const convoId = parts[1];
        const prompt = rawQ.slice(`continue_chat ${convoId}`.length).trim();
        if (!convoId ||!prompt) return reply(`*Usage:* ${prefix}claudeoff continue_chat <convoId> <message>`);

        const { data } = await axios.get(API, {
            params: { action: 'continue_chat', sessionId: sess.sessionId, conversationId: convoId, prompt },
            timeout: 90000
        });
        const ans = data.response || data.message || JSON.stringify(data).slice(0,4000);
        return conn.sendMessage(from, { text: `*🟣 Claude-Off*\n\n${ans}\n\n*Convo:* ${convoId.slice(0,8)}` }, { quoted: mek });
    }

    // Default chat action
    try {
        const { data } = await axios.get(API, {
            params: { action: 'chat', sessionId: sess.sessionId, prompt: rawQ },
            timeout: 90000
        });

        console.log('chat:', data);
        const answer = data.response || data.message || data.result || data.data?.response;
        const convoId = data.conversationId || data.conversation_id || data.id;

        if (!answer) return reply(`*Empty response:*\n${JSON.stringify(data).slice(0,1000)}`);

        if (convoId) {
            sess.lastConversationId = convoId;
            sess.conversations = sess.conversations || [];
            sess.conversations.push(convoId);
            saveSessions(sessions);
        }

        let txt = `*🟣 Claude-Off*\n\n${answer}`;
        if (convoId) txt += `\n\n_Convo: ${convoId.slice(0,12)}..._`;

        await conn.sendMessage(from, { text: txt }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        const err = e.response?.data || e.message;
        console.error('chat error:', err);
        // If session expired
        if (JSON.stringify(err).includes('session') || e.response?.status === 401) {
            delete sessions[userKey];
            saveSessions(sessions);
            return reply(`*❌ Session expired.*\nPlease re-auth:\n${prefix}claudeoff auth ${sess.email}`);
        }
        reply(`*❌ Chat failed:* ${typeof err === 'object'? JSON.stringify(err).slice(0,1000) : err}`);
    }

  } catch (e) {
    console.error('Claude-Off Fatal:', e);
    reply(`*❌ Fatal:* ${e.message}`);
  }
});