const {
    proto,
    getContentType,
    jidNormalizedUser,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');

const sms = (conn, m) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = jidNormalizedUser(m.fromMe ? conn.user.id : (m.participant ? m.participant : m.key.participant ? m.key.participant : m.chat));
    }
    
    if (m.message) {
        m.mtype = getContentType(m.message);
        
        // Gestion ViewOnce / Ephemeral
        if (m.mtype === 'viewOnceMessageV2' || m.mtype === 'viewOnceMessage') {
             m.message = m.message[m.mtype].message;
             m.mtype = getContentType(m.message);
        }
        
        m.msg = m.message[m.mtype];

        // ═══ QUOTED MESSAGE ═══
        // A fully-featured quoted object: flattened content-type shortcuts
        // (.imageMessage, .videoMessage, ...), .mtype, .text, .sender, and
        // an async .download() — this is the shape every plugin in this
        // project (vv, groupstatus, gc-setting, ig-dl, unblock, ...)
        // actually expects, so it's built once here instead of ad hoc.
        const qCtx = m.msg?.contextInfo;
        if (qCtx?.quotedMessage) {
            let innerMessage = qCtx.quotedMessage;
            let innerType = getContentType(innerMessage) || Object.keys(innerMessage)[0];

            // Unwrap view-once wrappers so .mtype/.download reflect the real media
            if (innerType === 'viewOnceMessageV2' || innerType === 'viewOnceMessage' || innerType === 'viewOnceMessageV2Extension') {
                innerMessage = innerMessage[innerType].message;
                innerType = getContentType(innerMessage) || Object.keys(innerMessage)[0];
            }

            const quotedSender = qCtx.participant ? jidNormalizedUser(qCtx.participant) : undefined;
            const content = innerMessage?.[innerType];

            m.quoted = {
                message: qCtx.quotedMessage,
                mtype: innerType,
                stanzaId: qCtx.stanzaId,
                participant: qCtx.participant,
                sender: quotedSender,
                key: {
                    remoteJid: m.chat,
                    fromMe: quotedSender && conn?.user?.id ? quotedSender === jidNormalizedUser(conn.user.id) : false,
                    id: qCtx.stanzaId,
                    participant: qCtx.participant,
                },
                text: content?.text || content?.caption
                    || innerMessage?.conversation
                    || innerMessage?.extendedTextMessage?.text
                    || '',
                download: async () => {
                    const DOWNLOADABLE = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
                    if (!DOWNLOADABLE.includes(innerType)) throw new Error('Quoted message has no downloadable media.');
                    const dlType = innerType.replace('Message', '');
                    const stream = await downloadContentFromMessage(content, dlType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    return buffer;
                },
            };

            // Flatten content-type shortcuts (m.quoted.imageMessage, etc.)
            // while keeping m.quoted.message for nested access patterns.
            if (innerMessage && typeof innerMessage === 'object') {
                for (const key of Object.keys(innerMessage)) {
                    if (key.endsWith('Message') || key === 'conversation') m.quoted[key] = innerMessage[key];
                }
            }
        } else {
            m.quoted = null;
        }
        
        // Récupération du texte (body)
        m.body = (m.mtype === 'conversation') ? m.message.conversation : 
                 (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : 
                 (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : 
                 (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                 (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                 (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                 (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                 (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';
                 
        // Alias pour répondre facilement
        m.reply = (text, chatId = m.chat, options = {}) => {
            return conn.sendMessage(chatId, { text: text }, { quoted: m, ...options });
        };
    }
    return m;
};

module.exports = { sms };                                            
