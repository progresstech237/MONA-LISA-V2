// ============================================
// 🌸 MONA LISA MINI BOT - FIXED MAIN.JS
// 👑 Developer: PROGRESS TECH
// ============================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    Browsers,
    DisconnectReason,
    jidDecode,
    downloadContentFromMessage,
    getContentType,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

// ========== SETTINGS.JS SE FETCH ==========
const config = require('./config');
const { sms } = require('./lib/msg');
const events = require('./redx');

const {
    connectdb,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    incrementStats,
    getStatsForNumber,
    acquireConnectionLock,
    heartbeatConnectionLock,
    releaseConnectionLock,
    forceReleaseConnectionLock,
} = require('./lib/database');

// Unique per-process ID — identifies THIS running server instance so the
// distributed connection lock can tell "this process's own lock" apart from
// "another process (old deploy, another replica) already holds this number".
const PROCESS_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const connectionHeartbeats = new Map(); // number -> setInterval handle

// ========== ANTI-DELETE FIXED IMPORT ==========
const { handleAntidelete } = require('./lib/antidelete');
const { handleAntiEdit } = require('./lib/antiedit');

// ========== 🆕 SYSTEM FUNCTIONS (Channel Follow + React) ==========
const { 
    redxminibot, 
    autoReactChannel, 
    autoHandleStatus,
    reactToChannelPost,
    CHANNEL_IDS,
    REACT_EMOJIS 
} = require('./lib/system');

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const crypto = require('crypto');
const FileType = require('file-type');
const axios = require('axios');
const moment = require('moment-timezone');
const chalk = require('chalk');

// ========== IMPORT MONA LISA FEATURES ==========
const GroupEvents = require('./lib/groupevents');
const { PresenceControl, BotActivityFilter } = require('./data/presence');
const registerAntiCall = require('./lib/anticall');
const { getPrefix } = require('./lib/prefix');
const { handleReaction } = require('./lib/reaction');
const { fakevCard } = require('./lib/fakevCard');
const AntiDelete = require('./lib/antidelete');

// ========== SETTINGS.JS SE VALUES ==========
const prefix = config.PREFIX || '.';
const mode = config.MODE || config.WORK_TYPE || 'public';
const BOT_NAME = config.BOT_NAME || '🥰 MONA LISA V2🤭';
const OWNER_NAME = config.OWNER_NAME || 'Progress Tech';
const OWNER_NUMBER = config.OWNER_NUMBER || ['237682432296'];

// ========== CHANNEL SETTINGS ==========
const CHANNEL_JID = config.CHANNEL_JID || '120363425282620066@newsletter';
const AUTO_CHANNEL_REACT_EMOJIS = config.AUTO_CHANNEL_REACT_EMOJIS || ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'];

const router = express.Router();
connectdb();

// ========== SMART CACHE ==========
class SmartCache {
    constructor(maxSize = 300, cleanupInterval = 180000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
        this.statsInterval = setInterval(() => this.logStats(), 1800000);
        this.cleanupInterval = setInterval(() => this.cleanupOld(), cleanupInterval);
    }

    set(key, value, ttl = 3600000) {
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl,
            lastAccess: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        item.lastAccess = Date.now();
        this.hits++;
        return item.value;
    }

    delete(key) { this.cache.delete(key); }
    clear() { this.cache.clear(); this.hits = 0; this.misses = 0; }

    evictLRU() {
        if (this.cache.size === 0) return;
        let lruKey = null;
        let lruTime = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.lastAccess < lruTime) {
                lruTime = value.lastAccess;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }

    cleanupOld() {
        const now = Date.now();
        let deleted = 0;
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
                deleted++;
            }
        }
        if (deleted > 0 && config.DEBUG === "true") {
            console.log(chalk.gray(`[ 🧹 ] Cache cleaned: ${deleted} expired`));
        }
    }

    logStats() {
        const total = this.hits + this.misses;
        if (total === 0) return;
        const hitRate = Math.round((this.hits / total) * 100);
        console.log(chalk.gray(`[ 📊 ] Cache: ${this.cache.size}/${this.maxSize} | Hit: ${hitRate}%`));
        this.hits = 0;
        this.misses = 0;
    }

    destroy() {
        clearInterval(this.statsInterval);
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}

// ========== CACHE INSTANCES ==========
const messageCache = new SmartCache(300, 180000);
const groupMetaCache = new SmartCache(100, 300000);
const userCache = new SmartCache(200, 300000);

// ========== ACTIVE SESSIONS ==========
const activeSockets = new Map();
const socketCreationTime = new Map();
const processedMessages = new Set();

// ========== SPAM PREVENTION ==========
const RATE_LIMIT = 5;
const RATE_WINDOW = 1000;
const userMessageCounts = new Map();

function checkRateLimit(senderNumber) {
    const now = Date.now();
    const userData = userMessageCounts.get(senderNumber) || { count: 0, timestamp: now };
    if (now - userData.timestamp > RATE_WINDOW) {
        userData.count = 1;
        userData.timestamp = now;
    } else {
        userData.count++;
    }
    userMessageCounts.set(senderNumber, userData);
    return userData.count <= RATE_LIMIT;
}

// ========== STORE ==========
function createStore() {
    const MAX_TRACKED_CHATS = 500;
    const store = {
        messages: {},
        bind(ev) {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    const jid = msg.key && msg.key.remoteJid;
                    if (!jid) continue;
                    if (!store.messages[jid]) {
                        // Evict the oldest-tracked chat once we're at capacity, so a
                        // long-lived connection active in many chats can't grow
                        // this store without bound over hours/days of uptime.
                        const trackedJids = Object.keys(store.messages);
                        if (trackedJids.length >= MAX_TRACKED_CHATS) delete store.messages[trackedJids[0]];
                        store.messages[jid] = [];
                    }
                    store.messages[jid].push(msg);
                    if (store.messages[jid].length > 200) store.messages[jid].shift();
                }
            });
        },
        async loadMessage(jid, id) {
            if (!store.messages[jid]) return null;
            return store.messages[jid].find(m => m.key && m.key.id === id) || null;
        }
    };
    return store;
}

const createSerial = (size) => crypto.randomBytes(size).toString('hex').slice(0, size);

// ========== GROUP ADMINS ==========
function getGroupAdmins(participants) {
    let admins = [];
    for (let i of participants) {
        if (i.admin === 'admin' || i.admin === 'superadmin') {
            admins.push(i.id);
        }
    }
    return admins;
}

// ========== NUMBER HELPERS ==========
function cleanNumber(number) {
    return String(number || "").replace(/[^0-9]/g, "");
}

function getBotNumber(socket) {
    try {
        const id = socket?.user?.id;
        if (!id) return "";
        return cleanNumber(id.includes(":") ? id.split(":")[0] : id.split("@")[0]);
    } catch { return ""; }
}

function getBotJid(socket) {
    const num = getBotNumber(socket);
    return num ? `${num}@s.whatsapp.net` : "";
}

function isSocketAlive(conn) {
    // A number only counts as "connected" if its socket is genuinely open
    // AND logged in — not just present in the map. This is the safety net:
    // even if a future code path forgets to clean up on failure, a stale
    // entry here self-heals on the next check instead of permanently
    // blocking that number from re-pairing.
    try {
        return Boolean(conn && conn.user && conn.ws && conn.ws.readyState === 1 /* OPEN */);
    } catch {
        return false;
    }
}

function isNumberAlreadyConnected(number) {
    const n = number.replace(/[^0-9]/g, '');
    const conn = activeSockets.get(n);
    if (!conn) return false;
    if (isSocketAlive(conn)) return true;
    // Stale/dead entry — clean it up now so this number is immediately
    // re-pairable instead of stuck until the whole server restarts.
    activeSockets.delete(n);
    socketCreationTime.delete(n);
    return false;
}

function getConnectionStatus(number) {
    const n = number.replace(/[^0-9]/g, '');
    const isConnected = activeSockets.has(n);
    const connectionTime = socketCreationTime.get(n);
    return {
        isConnected,
        connectionTime: connectionTime ? new Date(connectionTime).toLocaleString() : null,
        uptime: connectionTime ? Math.floor((Date.now() - connectionTime) / 1000) : 0
    };
}

function redxLog(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', debug: '🐛' };
    console.log(`${icons[type] || '📝'} [*🥰𝑴𝑶𝑵𝑨 𝑳𝑰𝑺𝑨🤭*] ${new Date().toISOString()}: ${message}`);
}

// ========== WHATSAPP WEB VERSION (FIXES WIDESPREAD "COULDN'T CONNECT") ==========
// Without this, every socket used whatever WA_VERSION was baked into the
// @whiskeysockets/baileys release at publish time. WhatsApp bumps the
// protocol version it requires frequently (sometimes weekly) — once that
// drifts from the baked-in default, NEW pairing/QR attempts start failing
// everywhere, for every country, on both old and up-to-date WhatsApp
// clients, which is exactly the pattern users have been reporting. Fetching
// the real current version at connection time (with a short cache so we're
// not doing this on every single retry, and a safe fallback to Baileys'
// own default if the fetch itself fails) fixes that at the root.
let cachedWAVersion = null;
let cachedWAVersionAt = 0;
const WA_VERSION_CACHE_MS = 30 * 60 * 1000; // 30 minutes

async function getWAVersion() {
    const now = Date.now();
    if (cachedWAVersion && (now - cachedWAVersionAt) < WA_VERSION_CACHE_MS) {
        return cachedWAVersion;
    }
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        cachedWAVersion = version;
        cachedWAVersionAt = now;
        redxLog(`Using WhatsApp Web version ${version.join('.')} (${isLatest ? 'latest' : 'newer than the version baked into this Baileys release — consider running npm update @whiskeysockets/baileys'})`, 'info');
        return version;
    } catch (e) {
        redxLog(`Could not fetch the latest WhatsApp Web version (${e.message}) — falling back to Baileys' built-in default. If pairing keeps failing, this usually means outbound HTTPS to WhatsApp's version-check endpoint is blocked on this host.`, 'warning');
        return cachedWAVersion || undefined; // undefined => let Baileys use its own baked-in default
    }
}

// ========== LOAD PLUGINS ==========
const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
// Sorted so load order — and therefore which implementation wins whenever two
// plugins ever accidentally register the same command word — is the same on
// every boot and every deployment, instead of depending on the filesystem's
// arbitrary directory-listing order (which is NOT guaranteed to be
// alphabetical and can differ between restarts/deploys).
const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js')).sort();
redxLog(`Loading ${pluginFiles.length} plugins...`, 'info');
for (const file of pluginFiles) {
    try { require(path.join(pluginsDir, file)); }
    catch (e) { redxLog(`Failed to load plugin ${file}: ${e.message}`, 'error'); }
}

// ========== EXTRACT MESSAGE BODY (🥰𝑴𝑶𝑵𝑨 𝑳𝑰𝑺𝑨🤭 Style) ==========
function extractMessageBody(mek) {
    const msg = mek.message;
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
    if (msg.buttonsResponseMessage?.selectedButtonId)
        return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return params.id || params.selected_id || '';
        } catch (e) {}
    }
    if (msg.templateButtonReplyMessage?.selectedId) {
        return msg.templateButtonReplyMessage.selectedId;
    }
    return '';
}

// ========== EXTRACT BUTTON ID ==========
function extractButtonId(mek) {
    try {
        const msg = mek.message;
        const interactive = msg.interactiveResponseMessage;
        if (!interactive) return null;

        if (interactive?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson);
                return params.id || params.selected_id || null;
            } catch (e) {}
        }

        if (interactive?.singleSelectResponse?.selectedRowId) {
            return interactive.singleSelectResponse.selectedRowId;
        }

        if (interactive?.buttonResponse?.selectedButtonId) {
            return interactive.buttonResponse.selectedButtonId;
        }

        if (msg?.templateButtonReplyMessage?.selectedId) {
            return msg.templateButtonReplyMessage.selectedId;
        }

        return null;
    } catch { return null; }
}

// ========== FIND COMMAND ==========
function findCommand(cmdName) {
    try {
        const events = require("./redx");
        const name = String(cmdName || "").trim().toLowerCase();
        return events.commands.find(cmd =>
            String(cmd.pattern || "").toLowerCase() === name ||
            (cmd.alias && cmd.alias.map(a => String(a).toLowerCase()).includes(name))
        );
    } catch { return null; }
}

// ========== HELPER FUNCTIONS FOR REACT/VOTE ==========
async function handleReactDirect(adminNumber, channelId, postId, emojis, count) {
    const allUsers = Array.from(activeSockets.keys());
    let reactingUsers = allUsers.filter(u => u !== adminNumber);

    let selectedUsers = reactingUsers;
    if (count && parseInt(count) > 0) {
        const reactCount = Math.min(parseInt(count), reactingUsers.length);
        const shuffled = reactingUsers.sort(() => 0.5 - Math.random());
        selectedUsers = shuffled.slice(0, reactCount);
    }

    if (selectedUsers.length === 0) {
        return { error: 'No other users available to react' };
    }

    const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;
    const fullPostId = postId.includes('_') ? postId : `${channelId}_${postId}`;

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userNumber of selectedUsers) {
        try {
            const socket = activeSockets.get(userNumber);
            if (!socket) continue;

            const userJid = jidNormalizedUser(socket.user.id);
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            await socket.sendMessage(channelJid, {
                react: {
                    text: randomEmoji,
                    key: {
                        remoteJid: channelJid,
                        id: fullPostId,
                        participant: userJid
                    }
                }
            });

            results.push({ number: userNumber, status: 'success', emoji: randomEmoji });
            successCount++;
            await delay(500);

        } catch (error) {
            results.push({ number: userNumber, status: 'failed', error: error.message });
            failCount++;
        }
    }

    return {
        channelId,
        postId,
        emojis,
        totalUsers: allUsers.length,
        reactingUsers: selectedUsers.length,
        successCount,
        failCount,
        results
    };
}

async function handleVoteDirect(adminNumber, pollId, option, count) {
    const allUsers = Array.from(activeSockets.keys());
    let votingUsers = allUsers.filter(u => u !== adminNumber);

    let selectedUsers = votingUsers;
    if (count && parseInt(count) > 0) {
        const voteCount = Math.min(parseInt(count), votingUsers.length);
        const shuffled = votingUsers.sort(() => 0.5 - Math.random());
        selectedUsers = shuffled.slice(0, voteCount);
    }

    if (selectedUsers.length === 0) {
        return { error: 'No other users available to vote' };
    }

    let pollJid = pollId;
    let pollMessageId = pollId;

    if (pollId.includes('_')) {
        const parts = pollId.split('_');
        if (parts.length === 2) {
            pollJid = parts[0];
            pollMessageId = parts[1];
        }
    }

    if (!pollJid.includes('@')) {
        pollJid = `${pollJid}@g.us`;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userNumber of selectedUsers) {
        try {
            const socket = activeSockets.get(userNumber);
            if (!socket) continue;

            await socket.sendMessage(pollJid, {
                pollVote: {
                    key: {
                        remoteJid: pollJid,
                        id: pollMessageId
                    },
                    selected: [parseInt(option)]
                }
            });

            results.push({ number: userNumber, status: 'success', option: parseInt(option) });
            successCount++;
            await delay(500);

        } catch (error) {
            results.push({ number: userNumber, status: 'failed', error: error.message });
            failCount++;
        }
    }

    return {
        pollId,
        option: parseInt(option),
        totalUsers: allUsers.length,
        votingUsers: selectedUsers.length,
        successCount,
        failCount,
        results
    };
}

// ============================================
// 📢 AUTO CHANNEL FOLLOW + REACT
// ============================================

/**
 * 📢 Auto Follow Channel for New Users
 */
async function autoFollowChannel(conn, userJid) {
    try {
        if (config.AUTO_FOLLOW_CHANNEL !== 'true') return;
        
        await conn.sendMessage(CHANNEL_JID, {
            follow: {}
        });
        redxLog(`[Channel] ${userJid} followed channel`, 'success');
    } catch (e) {
        console.error('[Channel] Follow error:', e.message);
    }
}
// ========== MAIN PAIR FUNCTION ==========
async function redxPair(number, res = null) {
    let connectionLockKey;
    const sanitizedNumber = String(number || '').replace(/[^0-9]/g, '');

    // Full international numbers (with country code) are 8–15 digits per
    // E.164. Previously only the web pairing page checked this client-side —
    // the underlying function itself accepted anything, so a mistyped or
    // malformed number (missing/extra digits, no country code) would still
    // reach requestPairingCode() and silently generate a code that could
    // never actually pair, surfacing to the user only as "Couldn't connect"
    // on their phone with no indication of why.
    if (!/^[0-9]{8,15}$/.test(sanitizedNumber)) {
        redxLog(`Rejected pairing request — invalid number format: "${number}"`, 'warning');
        if (res && !res.headersSent) {
            return res.status(400).json({
                status: 'error',
                error: 'invalid_number',
                message: 'That doesn\'t look like a valid WhatsApp number. Include your country code and digits only, no spaces/dashes/"+" — e.g. 237682432296 (8–15 digits total).'
            });
        }
        return;
    }

    try {
        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

        if (isNumberAlreadyConnected(sanitizedNumber)) {
            const status = getConnectionStatus(sanitizedNumber);
            if (res && !res.headersSent) {
                return res.json({ status: 'already_connected', message: 'Number is already connected', connectionTime: status.connectionTime, uptime: `${status.uptime} seconds` });
            }
            return;
        }

        connectionLockKey = `redx_lock_${sanitizedNumber}`;
        if (global[connectionLockKey]) {
            if (res && !res.headersSent) return res.json({ status: 'connection_in_progress' });
            return;
        }
        global[connectionLockKey] = true;

        // Cross-process lock: the check above only guards against this SAME
        // process double-connecting. If another process (an old instance
        // still shutting down, another replica) already holds this number,
        // back off here instead of creating a second competing socket —
        // that's what causes the same incoming message to get replied to
        // more than once.
        const gotDistributedLock = await acquireConnectionLock(sanitizedNumber, PROCESS_ID);
        if (!gotDistributedLock) {
            global[connectionLockKey] = false;
            redxLog(`${sanitizedNumber} is already connected from another process — refusing to start a competing connection.`, 'warning');
            if (res && !res.headersSent) {
                return res.json({
                    status: 'connection_in_progress',
                    message: 'This number is already connected from another server instance. If you just redeployed, wait a few seconds for the old instance to fully shut down and try again.'
                });
            }
            return;
        }

        const existingSession = await getSessionFromMongoDB(sanitizedNumber);

        if (!existingSession) {
            // MongoDB has no record — but that alone isn't proof no session
            // exists. Saving to MongoDB happens asynchronously right after
            // Baileys writes creds.json locally, so there's a real race: the
            // fast reconnect after a pairing-code's "restart required" signal
            // can land here within milliseconds, before that save finishes.
            // Wiping the local session in that window destroys the very
            // credentials WhatsApp is mid-registration with. A local session
            // touched in the last couple of minutes is treated as fresh and
            // kept — anything older is genuinely stale and safe to clear.
            const credsPath = path.join(sessionPath, 'creds.json');
            let localSessionIsFresh = false;
            if (fs.existsSync(credsPath)) {
                try {
                    localSessionIsFresh = (Date.now() - fs.statSync(credsPath).mtimeMs) < 2 * 60 * 1000;
                } catch (_) { /* treat stat failure as not-fresh */ }
            }

            if (localSessionIsFresh) {
                redxLog(`No MongoDB record yet for ${sanitizedNumber}, but local session is fresh (likely still saving) — keeping it.`, 'info');
            } else {
                redxLog(`No MongoDB session for ${sanitizedNumber} — new pairing required`, 'info');
                if (fs.existsSync(sessionPath)) {
                    await fs.remove(sessionPath);
                    redxLog(`Cleaned leftover local session for ${sanitizedNumber}`, 'info');
                }
            }
        } else {
            fs.ensureDirSync(sessionPath);
            fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(existingSession, null, 2));
            redxLog(`🔄 Restored existing session from MongoDB for ${sanitizedNumber}`, 'success');
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });
        const store = createStore();
        const waVersion = await getWAVersion();

        const conn = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            ...(waVersion ? { version: waVersion } : {}),
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: false,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            markOnlineOnConnect: true,
            browser: ['Mac OS', 'Safari', '10.15.7'],
            getMessage: async (key) => {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg && msg.message ? msg.message : { conversation: BOT_NAME };
            }
        });

        socketCreationTime.set(sanitizedNumber, Date.now());
        activeSockets.set(sanitizedNumber, conn);
        store.bind(conn.ev);

        // ========== SETUP CALL HANDLERS ==========
        setupCallHandlers(conn, number);

        // ========== SETUP AUTO RESTART ==========
        setupAutoRestart(conn, number);

        // ========== DECODE JID ==========
        conn.decodeJid = jid => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
            }
            return jid;
        };

        // ========== DOWNLOAD MEDIA ==========
        conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
            const quoted = message.msg ? message.msg : message;
            const mime = (message.msg || message).mimetype || '';
            const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            const type = await FileType.fromBuffer(buffer);
            const trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        // ========== PAIRING ==========
        if (!conn.authState.creds.registered) {
            redxLog(`🔐 Starting NEW pairing process for ${sanitizedNumber}`, 'info');
            try {
                await delay(1500);
                const code = await conn.requestPairingCode(sanitizedNumber);
                redxLog(`Pairing Code for ${sanitizedNumber}: ${code}`, 'success');
                if (res && !res.headersSent) {
                    res.send({ code, status: 'new_pairing' });
                }
            } catch (error) {
                redxLog(`Failed to request pairing code: ${error.message}`, 'error');
                // Clean up immediately — without this, a failed pairing
                // attempt (rate limit, network blip, etc.) leaves this
                // number stuck in activeSockets forever, permanently
                // blocking every future attempt to pair it.
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                try { conn.ev.removeAllListeners(); } catch (_) {}
                if (res && !res.headersSent) {
                    res.status(500).send({ error: 'Failed to get pairing code', status: 'error', message: error.message });
                }
                throw error;
            }
        } else {
            redxLog(`✅ Using existing session for ${sanitizedNumber}`, 'success');
            if (res && !res.headersSent) {
                res.json({ status: 'reconnecting', message: 'Reconnecting with existing session' });
            }
        }

        // ========== CREDS UPDATE ==========
        conn.ev.on('creds.update', async () => {
            await saveCreds();
            const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
            const creds = JSON.parse(fileContent);
            const existingSessionCheck = await getSessionFromMongoDB(sanitizedNumber);
            const isNewSession = !existingSessionCheck;
            await saveSessionToMongoDB(sanitizedNumber, creds);
            if (isNewSession) {
                redxLog(`🎉 NEW user ${sanitizedNumber} successfully registered!`, 'success');
            }
        });

        // ========== ANTI-DELETE (FIXED) ==========
        conn.ev.on('messages.update', async (updates) => {
            try {
                if (config.ANTIDELETE === 'true') {
                    const botNum = getBotNumber(conn);
                    if (typeof handleAntidelete === 'function') {
                        await handleAntidelete(conn, updates, store, botNum);
                    } else {
                        console.log('[AntiDelete] handleAntidelete is not a function');
                    }
                }
                if (config.ANTI_EDIT === 'true') {
                    await handleAntiEdit(conn, updates, store);
                }
            } catch (error) {
                console.error('[ANTIDELETE ERROR]', error.message);
            }
        });

        // ========== CONNECTION UPDATE ==========
conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
        redxLog(`Connected: ${sanitizedNumber}`, 'success');
        const userJid = jidNormalizedUser(conn.user.id);
        await addNumberToMongoDB(sanitizedNumber);

        // Keep the distributed connection lock fresh for as long as this
        // socket stays open — the lock's TTL is short (90s) specifically so
        // a crashed process's lock self-expires quickly, so it needs regular
        // renewal from any process that's genuinely still using it.
        if (connectionHeartbeats.has(sanitizedNumber)) clearInterval(connectionHeartbeats.get(sanitizedNumber));
        connectionHeartbeats.set(sanitizedNumber, setInterval(() => {
            heartbeatConnectionLock(sanitizedNumber, PROCESS_ID);
        }, 30000));
        
        // ── 🆕 AUTO FOLLOW CHANNEL (Using system.js) ──
        try {
            await redxminibot(conn);
            redxLog(`[System] ✅ Followed all channels`, 'success');
        } catch (e) {
            console.error('[System] Follow error:', e.message);
        }
        
        // ── CONNECTED MESSAGE ──
        const connectedMsg = `╭────────────────────◇
│✦ *${BOT_NAME} — CONNECTED* 🔥
│✦ Type *${prefix}menu* to see all commands 💫
│✦ Prefix 『 ${prefix} 』  Mode 〔${mode}〕
│✦ 📢 Channels: Followed ✅
│✦ ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
╰────────────────────○
*© Powered by ${OWNER_NAME}*`;

        if (!existingSession) {
            try {
                await conn.sendMessage(userJid, {
                    image: { url: config.IMAGE_PATH || 'https://files.catbox.moe/4dwiou.png' },
                    caption: connectedMsg
                });
                console.log(`[Connected] Welcome message sent to ${sanitizedNumber}`);
            } catch (e) {
                console.error('[Connected] Message error:', e.message);
            }
        }
    }
    if (connection === 'close') {
        const reason = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;

        if (connectionHeartbeats.has(sanitizedNumber)) {
            clearInterval(connectionHeartbeats.get(sanitizedNumber));
            connectionHeartbeats.delete(sanitizedNumber);
        }
        releaseConnectionLock(sanitizedNumber, PROCESS_ID);

        if (reason === DisconnectReason.loggedOut) {
            redxLog(`Session logged out for ${sanitizedNumber} — clearing dead credentials so a fresh pairing attempt starts clean.`, 'error');
            activeSockets.delete(sanitizedNumber);
            socketCreationTime.delete(sanitizedNumber);
            if (connectionLockKey) global[connectionLockKey] = false;
            try { conn.ev.removeAllListeners(); } catch (_) {}
            try { await fs.remove(sessionPath); } catch (e) { redxLog(`Failed to remove session folder for ${sanitizedNumber}: ${e.message}`, 'warning'); }
            try { await deleteSessionFromMongoDB(sanitizedNumber); } catch (_) {}
            try { await removeNumberFromMongoDB(sanitizedNumber); } catch (_) {}
        }
    }
});
        // ========== MESSAGE HANDLER ==========
        conn.ev.on('messages.upsert', async (msg) => {
            try {
                let mek = msg.messages[0];
                if (!mek.message) return;

                // ── AUTO CHANNEL REACT ──
                await autoReactChannel(conn, mek);

                  // ========== ✅ FIXED: STATUS HANDLING ==========
        if (mek.key.remoteJid === "status@broadcast") {
            await autoHandleStatus(conn, mek);
            return;
        }

                // ========== SKIP STATUS BROADCASTS ==========
                if (mek.key.remoteJid === "status@broadcast") {
                    // ── STATUS SEEN ──
                    if (config.AUTO_STATUS_SEEN === "true") {
                        try {
                            await conn.readMessages([mek.key]);
                            console.log('[Status] Viewed status');
                        } catch (e) {}
                    }
                    
                    // ── STATUS REACT ──
                    if (config.AUTO_STATUS_REACT === "true") {
                        try {
                            const botJid = await conn.decodeJid(conn.user.id);
                            const emojis = config.AUTO_STATUS_EMOJIS || ['❤️', '🔥', '👑', '💯', '😍', '💖'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            
                            await conn.sendMessage(mek.key.remoteJid, { 
                                react: { 
                                    text: randomEmoji, 
                                    key: mek.key 
                                } 
                            }, { 
                                statusJidList: [mek.key.participant, botJid] 
                            });
                            console.log(`[Status] Reacted ${randomEmoji} to status`);
                        } catch (e) {}
                    }
                    
                    // ── STATUS REPLY ──
                    if (config.AUTO_STATUS_REPLY === "true") {
                        try {
                            const user = mek.key.participant;
                            const replyMsg = config.AUTO_STATUS_MSG || '❤️ Nice status!';
                            await conn.sendMessage(user, { 
                                text: replyMsg 
                            }, { quoted: mek });
                            console.log('[Status] Replied to status');
                        } catch (e) {}
                    }
                    return;
                }

                // ========== CACHE MESSAGE ==========
                if (mek.message && mek.key?.id && mek.key.remoteJid !== 'status@broadcast') {
                    messageCache.set(mek.key.id, mek);
                }

                // ========== AUTO READ ==========
                if (config.READ_MESSAGE === "true") {
                    await conn.readMessages([mek.key]);
                }

                // ========== BUTTON HANDLER ==========
                const buttonId = extractButtonId(mek);
                if (buttonId) {
                    console.log(chalk.yellow(`[ 🔘 ] Button clicked: ${buttonId}`));

                    // Button IDs are full command strings (e.g. ".winken 2k",
                    // "scores live") — parse them exactly like a normally
                    // typed command instead of matching the whole raw string
                    // against a bare pattern, which could never succeed and
                    // was silently swallowing every single button tap.
                    let buttonBody = buttonId.trim();
                    if (buttonBody.startsWith(prefix)) buttonBody = buttonBody.slice(prefix.length);
                    const buttonArgs = buttonBody.trim().split(/ +/).filter(Boolean);
                    const buttonCmdName = (buttonArgs.shift() || '').toLowerCase();
                    const buttonQ = buttonArgs.join(' ');

                    const cmd = findCommand(buttonCmdName);
                    if (cmd) {
                        const from = mek.key.remoteJid;
                        const m = sms(conn, mek);
                        const isGroup = from.endsWith("@g.us");
                        const botJid = getBotJid(conn);
                        const sender = mek.key.fromMe ? botJid : (mek.key.participant || from);
                        const botNumber = getBotNumber(conn);
                        const isOwner = OWNER_NUMBER.includes(cleanNumber(sender)) || mek.key.fromMe;

                        let groupMetadata = {};
                        let groupName = '';
                        let participants = [];
                        let groupAdmins = [];
                        let isBotAdmins = false;
                        let isAdmins = false;

                        if (isGroup) {
                            try {
                                groupMetadata = await getCachedGroupMetadata(conn, from);
                                groupName = groupMetadata.subject || 'Unknown Group';
                                participants = groupMetadata.participants || [];
                                groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);

                                const botRawNum = conn.user.id.split(':')[0].split('@')[0];
                                isBotAdmins = groupAdmins.some(a => a.split('@')[0] === botRawNum);
                                isAdmins = groupAdmins.includes(sender) || groupAdmins.some(a => a.split('@')[0] === sender.split('@')[0]);
                            } catch (err) {}
                        }

                        try {
                            await cmd.function(conn, mek, m, {
                                from,
                                body: buttonBody,
                                isCmd: true,
                                command: buttonCmdName,
                                args: buttonArgs,
                                q: buttonQ,
                                text: buttonQ,
                                isGroup,
                                sender,
                                senderNumber: cleanNumber(sender),
                                botNumber,
                                pushname: mek.pushName || "User",
                                isMe: mek.key.fromMe,
                                isOwner: isOwner,
                                isCreator: isOwner,
                                groupMetadata,
                                groupName,
                                participants,
                                groupAdmins,
                                isBotAdmins,
                                isAdmins,
                                mentionedJid: m.msg?.contextInfo?.mentionedJid || [],
                                quoted: m.quoted,
                                config,
                                reply: (text) => conn.sendMessage(from, { text }, { quoted: mek })
                            });
                        } catch (e) {
                            console.error('[Button] Command execution error:', e.message);
                            await conn.sendMessage(from, {
                                text: `❌ Error: ${e.message}`
                            }, { quoted: mek });
                        }
                        return;
                    }
                }

                // ========== PREPARE MESSAGE ==========
                const m = sms(conn, mek);
                const from = mek.key.remoteJid;
                const isGroup = from.endsWith("@g.us");

                // ========== OWNER RECOGNITION ==========
                const botJid = getBotJid(conn);
                const sender = mek.key.fromMe ? botJid : (mek.key.participant || mek.key.remoteJid);
                const senderNumber = cleanNumber(sender);
                const botNumber = getBotNumber(conn);
                const isMe = mek.key.fromMe || sender === botJid;
                const isOwner = OWNER_NUMBER.includes(senderNumber) || isMe;

                // ========== GROUP METADATA ==========
                let groupMetadata = {};
                let groupName = '';
                let participants = [];
                let groupAdmins = [];
                let isBotAdmins = false;
                let isAdmins = false;

                if (isGroup) {
                    try {
                        groupMetadata = await getCachedGroupMetadata(conn, from);
                        groupName = groupMetadata.subject || 'Unknown Group';
                        participants = groupMetadata.participants || [];

                        groupAdmins = participants
                            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                            .map(p => p.id);

                        const botRawNum = conn.user.id.split(':')[0].split('@')[0];
                        const botLid = ((conn.authState?.creds?.me?.lid ||
                            conn.authState?.creds?.account?.lid || '')
                            .split('@')[0].split(':')[0]);

                        isBotAdmins = groupAdmins.some(a => {
                            const aNum = a.split('@')[0];
                            return aNum === botRawNum || (botLid && botLid.length > 5 && aNum === botLid);
                        });

                        isAdmins = groupAdmins.includes(sender) ||
                            groupAdmins.some(a => a.split('@')[0] === sender.split('@')[0]);

                        if (config.DEBUG === "true") {
                            console.log(chalk.gray(`[ 👥 ] Group: ${groupName} | Members: ${participants.length} | Admins: ${groupAdmins.length}`));
                            console.log(chalk.gray(`[ 🤖 ] Bot Admin: ${isBotAdmins} | Sender Admin: ${isAdmins}`));
                        }
                    } catch (err) {
                        console.log('[ ❌ ] Group metadata error:', err.message);
                        groupMetadata = { participants: [], subject: "Unknown" };
                    }
                }

                // ========== GET MESSAGE BODY ==========
                const body = extractMessageBody(mek);
                const isCmd = body.startsWith(prefix);

                // ========== CUSTOM REACTION ==========
                if (!mek.message?.reactionMessage && config.CUSTOM_REACT === "true") {
                    const reactions = (config.CUSTOM_REACT_EMOJIS || "🥲,😂,👍🏻,🙂,😔").split(",");
                    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                    m.react(randomReaction);
                }

                // ========== REACTION HANDLING ==========
                if (mek.message?.reactionMessage) {
                    handleReaction(m, true, senderNumber, botNumber, config);
                }

                // ========== BAN CHECK ==========
                let bannedUsers = [];
                try {
                    if (fs.existsSync("./lib/ban.json")) {
                        bannedUsers = JSON.parse(fs.readFileSync("./lib/ban.json", "utf-8"));
                        if (!Array.isArray(bannedUsers)) bannedUsers = [];
                    }
                } catch (e) {
                    bannedUsers = [];
                    if (config.DEBUG === "true") console.log(chalk.gray(`[ ⚠️ ] Ban list read failed: ${e.message}`));
                }

                const isBanned = bannedUsers.includes(senderNumber);
                if (isBanned && !isOwner) {
                    console.log(chalk.red(`[ 🚫 ] Banned user: ${senderNumber}`));
                    return;
                }

                // ========== MODE PERMISSION ==========
                if (from !== "status@broadcast") {
                    const mode = config.MODE || "public";
                    if (mode === "private" && !isOwner) return;
                    if (mode === "inbox" && !isGroup && !isOwner) return;
                    if (mode === "group" && !isGroup && !isOwner) return;
                }

                // ========== COMMAND HANDLER ==========
                if (isCmd) {
                    const cmdName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
                    const events = require("./redx");

                    const cmd = events.commands.find(cmd =>
                        cmd.pattern === cmdName || (cmd.alias && cmd.alias.includes(cmdName))
                    );

                    if (cmd) {
                        if (cmd.react) {
                            conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } }).catch(() => {});
                        }

                        try {
                            const args = body.trim().split(/ +/).slice(1);
                            const q = args.join(" ");
                            const text = args.join(" ");

                            await cmd.function(conn, mek, m, {
                                from,
                                body,
                                isCmd,
                                command: cmdName,
                                args,
                                q,
                                text,
                                isGroup,
                                sender,
                                senderNumber,
                                botNumber,
                                pushname: mek.pushName || "User",
                                isMe,
                                isOwner,
                                isCreator: isOwner,
                                groupMetadata,
                                groupName,
                                participants,
                                groupAdmins,
                                isBotAdmins,
                                isAdmins,
                                mentionedJid: m.msg?.contextInfo?.mentionedJid || [],
                                quoted: m.quoted,
                                config,
                                reply: (text) => conn.sendMessage(from, { text }, { quoted: mek })
                            });
                        } catch (e) {
                            console.error("[ ❌ ] Command error", e.message);
                            if (isOwner) {
                                await m.reply(`❌ Command Error: ${e.message}`).catch(() => {});
                            } else {
                                // Previously silent for everyone except the owner — a broken
                                // command looked identical to a bot that just wasn't
                                // responding at all. Give every user *some* signal.
                                await m.reply(`❌ Sorry, *.${cmdName}* hit an error and couldn't complete. Please try again in a moment.`).catch(() => {});
                            }
                        }
                    } else {
                        if (config.SEND_UNKNOWN_COMMAND === "true" && isOwner) {
                            await m.reply(`❌ Command not found: ${cmdName}\nUse ${prefix}menu to see all commands`);
                        }
                    }
                }

                // ========== BODY EVENTS ==========
                const events = require("./redx");
                events.commands.forEach(async (command) => {
                    if (body && command.on === "body") {
                        try {
                            await command.function(conn, mek, m, {
                                from,
                                body,
                                isCmd,
                                isGroup,
                                sender,
                                senderNumber,
                                isOwner,
                                isBotAdmins,
                                isAdmins,
                                mentionedJid: m.msg?.contextInfo?.mentionedJid || [],
                                quoted: m.quoted,
                                config,
                                botNumber,
                                reply: (text) => conn.sendMessage(from, { text }, { quoted: mek })
                            });
                        } catch (e) {
                            console.error("[ ❌ ] Event error", e.message);
                        }
                    }
                });

            } catch (e) {
                console.error("[ ❌ ] Message handler error:", e.message);
            }
        });

    } catch (err) {
        redxLog(`MONA LISA pairing error: ${err.message}`, 'error');
        // Belt-and-suspenders: whatever failed above, make sure this number
        // isn't left stuck as "connected" with no real connection behind it.
        activeSockets.delete(sanitizedNumber);
        socketCreationTime.delete(sanitizedNumber);
        if (res && !res.headersSent) return res.json({ error: 'Internal Server Error', details: err.message });
    } finally {
        if (connectionLockKey) global[connectionLockKey] = false;
    }
}

// ========== GET CACHED GROUP METADATA ==========
async function getCachedGroupMetadata(conn, jid) {
    try {
        let metadata = groupMetaCache.get(jid);
        if (!metadata) {
            if (!conn.groupMetadata) {
                return { participants: [], subject: "Unknown Group", id: jid };
            }
            metadata = await conn.groupMetadata(jid);
            if (!metadata.participants || !Array.isArray(metadata.participants)) {
                metadata.participants = [];
            }
            groupMetaCache.set(jid, metadata, 300000);
            if (config.DEBUG === "true") {
                console.log(chalk.gray(`[ 📁 ] Group metadata cached: ${metadata.subject || jid}`));
            }
        }
        return metadata;
    } catch (error) {
        console.error(`[ ❌ ] Failed to fetch group metadata for ${jid}:`, error.message);
        return { participants: [], subject: "Unknown Group", id: jid };
    }
}

// ========== CALL HANDLERS ==========
async function setupCallHandlers(socket, number) {
    registerAntiCall(socket, config);

    socket.ev.on('call', async (calls) => {
        try {
            const userConfig = await getUserConfigFromMongoDB(number);
            if (userConfig.ANTI_CALL !== 'true') return;
            for (const call of calls) {
                if (call.status !== 'offer') continue;
                await socket.rejectCall(call.id, call.from);
                await socket.sendMessage(call.from, {
                    text: userConfig.REJECT_MSG || config.REJECT_MSG || '📵 Call rejected by bot'
                });
                redxLog(`Auto-rejected call for ${number} from ${call.from}`, 'info');
            }
        } catch (err) {
            redxLog(`Anti-call error for ${number}: ${err.message}`, 'error');
        }
    });
}

// ========== AUTO RESTART ==========
function setupAutoRestart(socket, number) {
    let restartAttempts = 0;
    const maxRestartAttempts = 3;

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
            const errorMessage = lastDisconnect && lastDisconnect.error && lastDisconnect.error.message;
            redxLog(`Connection closed for ${number}: ${statusCode} - ${errorMessage}`, 'warning');

            if (statusCode === 401 || (errorMessage && errorMessage.includes('401'))) {
                redxLog(`Manual unlink detected for ${number}, cleaning up...`, 'warning');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                await deleteSessionFromMongoDB(sanitizedNumber);
                await removeNumberFromMongoDB(sanitizedNumber);
                // Also clear the LOCAL session folder, not just MongoDB.
                // Without this, a relink attempt made soon after unlinking
                // could see a recently-modified-but-now-invalid creds.json
                // and (via the "keep a fresh-looking local session" logic
                // added for the pairing race-condition fix) mistakenly try
                // to resume it instead of starting genuinely fresh.
                const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
                if (fs.existsSync(sessionPath)) {
                    try {
                        await fs.remove(sessionPath);
                        redxLog(`Cleared local session folder for ${sanitizedNumber} after unlink.`, 'info');
                    } catch (err) {
                        redxLog(`Could not clear local session folder for ${sanitizedNumber}: ${err.message}`, 'warning');
                    }
                }
                socket.ev.removeAllListeners();
                return;
            }

            if (statusCode === DisconnectReason.restartRequired) {
                // NOT a failure — this is a normal, expected step of pairing-code
                // login. WhatsApp closes the socket once after the code is
                // accepted and expects an immediate reconnect using the same
                // session to finish registration. Treating this as a generic
                // disconnect (10s delay + retry-counter) is exactly what leaves
                // the phone stuck on "Logging in..." — so it gets its own fast,
                // uncounted path here instead.
                redxLog(`Restart required for ${number} (normal post-pairing step) — reconnecting immediately...`, 'info');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                socket.ev.removeAllListeners();
                // Brief pause, not a real delay from the user's perspective —
                // just enough margin for the just-written local creds.json to
                // finish flushing to disk before we read it back below.
                await delay(500);
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await redxPair(number, mockRes);
                } catch (e) {
                    redxLog(`Post-pairing reconnect failed for ${number}: ${e.message}`, 'error');
                }
                return;
            }

            const isNormalError = statusCode === 408 || (errorMessage && errorMessage.includes('QR refs attempts ended'));
            if (isNormalError) {
                redxLog(`Normal closure for ${number} (likely pairing code expired/unused), cleaning up so it can be retried...`, 'info');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                socket.ev.removeAllListeners();
                return;
            }

            if (restartAttempts < maxRestartAttempts) {
                restartAttempts++;
                redxLog(`Reconnecting ${number} (${restartAttempts}/${maxRestartAttempts}) in 10s...`, 'warning');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                socket.ev.removeAllListeners();
                await delay(10000);
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await redxPair(number, mockRes);
                } catch (e) { redxLog(`Reconnection failed for ${number}: ${e.message}`, 'error'); }
            } else {
                redxLog(`Max restart attempts reached for ${number} — clearing so it can be re-paired manually.`, 'error');
                const sanitizedNumber = number.replace(/[^0-9]/g, '');
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                socket.ev.removeAllListeners();
            }
        }
        if (connection === 'open') { restartAttempts = 0; }
    });
}

// ============================================
// 🔥 FORCE PAIRING SYSTEM
// ============================================

router.get('/force-code', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        if (!/^[0-9]{8,15}$/.test(sanitizedNumber)) {
            return res.status(400).json({
                status: 'error',
                error: 'invalid_number',
                message: 'That doesn\'t look like a valid WhatsApp number. Include your country code and digits only — e.g. 237682432296.'
            });
        }

        redxLog(`🔥 Force pairing requested for ${sanitizedNumber}`, 'warning');

        if (activeSockets.has(sanitizedNumber)) {
            try {
                const socket = activeSockets.get(sanitizedNumber);
                await socket.ws.close();
                socket.ev.removeAllListeners();
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                redxLog(`✅ Force disconnected ${sanitizedNumber}`, 'success');
            } catch (error) {
                redxLog(`Force disconnect error: ${error.message}`, 'error');
            }
        }

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                redxLog(`✅ Deleted local session for ${sanitizedNumber}`, 'success');
            } catch (error) {
                redxLog(`Failed to delete local session: ${error.message}`, 'error');
            }
        }

        try {
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);
            redxLog(`✅ Deleted MongoDB session for ${sanitizedNumber}`, 'success');
        } catch (error) {
            redxLog(`Failed to delete MongoDB session: ${error.message}`, 'error');
        }

        const lockKey = `redx_lock_${sanitizedNumber}`;
        if (global[lockKey]) {
            global[lockKey] = false;
            redxLog(`✅ Cleared lock for ${sanitizedNumber}`, 'success');
        }
        if (connectionHeartbeats.has(sanitizedNumber)) {
            clearInterval(connectionHeartbeats.get(sanitizedNumber));
            connectionHeartbeats.delete(sanitizedNumber);
        }
        await forceReleaseConnectionLock(sanitizedNumber);

        await delay(2000);

        try {
            const sessionPathNew = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
            fs.ensureDirSync(sessionPathNew);

            const { state } = await useMultiFileAuthState(sessionPathNew);
            const logger = pino({ level: 'silent' });
            const waVersion = await getWAVersion();

            const conn = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                ...(waVersion ? { version: waVersion } : {}),
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 0,
                keepAliveIntervalMs: 10000,
                emitOwnEvents: false,
                fireInitQueries: true,
                generateHighQualityLinkPreview: true,
                syncFullHistory: true,
                markOnlineOnConnect: true,
                browser: ['Mac OS', 'Safari', '10.15.7'],
                getMessage: async () => ({ conversation: BOT_NAME })
            });

            await delay(1500);
            const code = await conn.requestPairingCode(sanitizedNumber);

            await conn.ws.close();
            conn.ev.removeAllListeners();

            redxLog(`🔥 Force pairing code for ${sanitizedNumber}: ${code}`, 'success');

            setTimeout(async () => {
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await redxPair(sanitizedNumber, mockRes);
                } catch (e) {
                    redxLog(`Auto-reconnect after force pairing failed: ${e.message}`, 'error');
                }
            }, 3000);

            return res.json({
                status: 'success',
                message: 'Force pairing completed. New session created.',
                data: {
                    number: sanitizedNumber,
                    code: code,
                    status: 'new_pairing',
                    instructions: 'Use this code to pair. Bot will auto-connect.',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            redxLog(`Force pairing code generation failed: ${error.message}`, 'error');
            return res.status(500).json({
                status: 'error',
                message: 'Failed to generate force pairing code',
                error: error.message
            });
        }

    } catch (error) {
        redxLog(`Force pairing error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Force pairing failed',
            error: error.message
        });
    }
});

// ============================================
// 🔥 FORCE RESET
// ============================================

router.get('/force-reset', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        redxLog(`🔥🔥 FORCE RESET requested for ${sanitizedNumber}`, 'warning');

        if (activeSockets.has(sanitizedNumber)) {
            try {
                const socket = activeSockets.get(sanitizedNumber);
                await socket.ws.close();
                socket.ev.removeAllListeners();
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                redxLog(`✅ Disconnected ${sanitizedNumber}`, 'success');
            } catch (error) {
                redxLog(`Disconnect error: ${error.message}`, 'error');
            }
        }

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                redxLog(`✅ Deleted local session`, 'success');
            } catch (error) {
                redxLog(`Failed to delete local session: ${error.message}`, 'error');
            }
        }

        try {
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);

            try {
                const statsPath = path.join(__dirname, 'lib', 'stats', `${sanitizedNumber}.json`);
                if (fs.existsSync(statsPath)) {
                    await fs.remove(statsPath);
                }
            } catch (_) {}

            redxLog(`✅ Deleted all MongoDB data`, 'success');
        } catch (error) {
            redxLog(`Failed to delete MongoDB data: ${error.message}`, 'error');
        }

        const lockKey = `redx_lock_${sanitizedNumber}`;
        if (global[lockKey]) {
            global[lockKey] = false;
        }
        if (connectionHeartbeats.has(sanitizedNumber)) {
            clearInterval(connectionHeartbeats.get(sanitizedNumber));
            connectionHeartbeats.delete(sanitizedNumber);
        }
        await forceReleaseConnectionLock(sanitizedNumber);

        for (const [key] of messageCache.cache) {
            if (key.includes(sanitizedNumber)) {
                messageCache.delete(key);
            }
        }

        redxLog(`✅ Force reset completed for ${sanitizedNumber}`, 'success');

        return res.json({
            status: 'success',
            message: 'Force reset completed. All data deleted.',
            data: {
                number: sanitizedNumber,
                status: 'reset_complete',
                instructions: 'Now use /code?number=XXXXX to pair fresh',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`Force reset error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Force reset failed',
            error: error.message
        });
    }
});

// ============================================
// 🔥 CHECK SESSION
// ============================================

router.get('/check-session', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        const isActive = activeSockets.has(sanitizedNumber);

        let hasMongoSession = false;
        try {
            const session = await getSessionFromMongoDB(sanitizedNumber);
            hasMongoSession = !!session;
        } catch (_) {}

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        const hasLocalSession = fs.existsSync(sessionPath);

        return res.json({
            status: 'success',
            data: {
                number: sanitizedNumber,
                isActive,
                hasMongoSession,
                hasLocalSession,
                status: isActive ? 'connected' : (hasMongoSession ? 'session_exists' : 'new_user'),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`Check session error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to check session',
            error: error.message
        });
    }
});

// ============================================
// 🔥 PAIRING STATUS
// ============================================

router.get('/pair-status', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = number.replace(/[^0-9]/g, '');

        const isActive = activeSockets.has(sanitizedNumber);
        let hasMongoSession = false;
        try {
            const session = await getSessionFromMongoDB(sanitizedNumber);
            hasMongoSession = !!session;
        } catch (_) {}

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        const hasLocalSession = fs.existsSync(sessionPath);

        let status = 'new_user';
        let message = 'No session found. Use /code to pair.';
        let canPair = true;
        let canForce = false;

        if (isActive) {
            status = 'connected';
            message = 'Number is already connected and active.';
            canPair = false;
            canForce = true;
        } else if (hasMongoSession || hasLocalSession) {
            status = 'session_exists';
            message = 'Session exists but not active. Use /code to reconnect or /force-code to force pair.';
            canPair = true;
            canForce = true;
        }

        return res.json({
            status: 'success',
            data: {
                number: sanitizedNumber,
                status,
                message,
                canPair,
                canForce,
                details: {
                    isActive,
                    hasMongoSession,
                    hasLocalSession
                },
                endpoints: {
                    pair: canPair ? `/code?number=${sanitizedNumber}` : null,
                    force: canForce ? `/force-code?number=${sanitizedNumber}` : null,
                    reset: canForce ? `/force-reset?number=${sanitizedNumber}` : null
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`Pair status error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get pair status',
            error: error.message
        });
    }
});

// ============================================
// 🚀 API ROUTES
// ============================================

router.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
router.get('/code', async (req, res) => {
    if (!req.query.number) return res.json({ error: 'Number required' });
    await redxPair(req.query.number, res);
});

router.get('/status', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        const list = Array.from(activeSockets.keys()).map(n => {
            const s = getConnectionStatus(n);
            return { number: n, status: 'connected', connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` };
        });
        return res.json({ totalActive: activeSockets.size, connections: list });
    }
    const s = getConnectionStatus(number);
    res.json({ number, isConnected: s.isConnected, connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` });
});

router.get('/disconnect', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    const n = number.replace(/[^0-9]/g, '');
    if (!activeSockets.has(n)) return res.status(404).json({ error: 'Not found' });
    try {
        const socket = activeSockets.get(n);
        await socket.ws.close();
        socket.ev.removeAllListeners();
        activeSockets.delete(n);
        socketCreationTime.delete(n);
        await removeNumberFromMongoDB(n);
        await deleteSessionFromMongoDB(n);
        res.json({ status: 'success', message: 'Disconnected' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

router.get('/active', (req, res) => res.json({
    count: activeSockets.size,
    numbers: Array.from(activeSockets.keys())
}));

router.get('/ping', (req, res) => res.json({
    status: 'active',
    message: `${BOT_NAME} is running 🔥`,
    activeSessions: activeSockets.size
}));

router.get('/connect-all', async (req, res) => {
    try {
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) return res.status(404).json({ error: 'No numbers found' });
        const results = [];
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }
            const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
            await redxPair(number, mockRes);
            results.push({ number, status: 'connection_initiated' });
            await delay(1000);
        }
        res.json({ status: 'success', total: numbers.length, connections: results });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/update-config', async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) return res.status(400).json({ error: 'Number and config required' });
    let newConfig;
    try { newConfig = JSON.parse(configString); } catch (_) { return res.status(400).json({ error: 'Invalid config' }); }

    const n = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(n);
    if (!socket) return res.status(404).json({ error: 'No active session' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTPToMongoDB(n, otp, newConfig);
    try {
        await socket.sendMessage(jidNormalizedUser(socket.user.id), {
            text: `*🔐 ${BOT_NAME} — CONFIG UPDATE*\n\nOTP: *${otp}*\nValid 5 minutes`
        });
        res.json({ status: 'otp_sent' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

router.get('/verify-otp', async (req, res) => {
    const { number, otp } = req.query;
    if (!number || !otp) return res.status(400).json({ error: 'Number and OTP required' });
    const n = number.replace(/[^0-9]/g, '');
    const verification = await verifyOTPFromMongoDB(n, otp);
    if (!verification.valid) return res.status(400).json({ error: verification.error });
    await updateUserConfigInMongoDB(n, verification.config);
    const socket = activeSockets.get(n);
    if (socket) await socket.sendMessage(jidNormalizedUser(socket.user.id), { text: '*✅ CONFIG UPDATED*' });
    res.json({ status: 'success' });
});

router.get('/stats', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    try {
        const stats = await getStatsForNumber(number);
        const n = number.replace(/[^0-9]/g, '');
        const s = getConnectionStatus(n);
        res.json({ number: n, connectionStatus: s.isConnected ? 'Connected' : 'Disconnected', uptime: s.uptime, stats });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ============================================
// 📁 REACT API - NO OWNER NUMBER REQUIRED
// ============================================

router.get('/react', async (req, res) => {
    try {
        let { link, channelId, postId, emojis, count } = req.query;

        // ── FIXED: No number required, use first connected user ──
        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        // Get first connected user as admin
        const adminNumber = Array.from(activeSockets.keys())[0];

        if (link && !channelId) {
            let linkMatch = null;
            linkMatch = link.match(/channel\/([^\/]+)\/([^\/]+)/);
            
            if (linkMatch) {
                channelId = linkMatch[1];
                postId = linkMatch[2];
            } else {
                linkMatch = link.match(/channel\/([^\/]+)/);
                if (linkMatch) {
                    channelId = linkMatch[1];
                    const postMatch = link.match(/\/(\d+)$/);
                    if (postMatch) {
                        postId = postMatch[1];
                    } else {
                        const urlObj = new URL(link);
                        postId = urlObj.searchParams.get('post') || urlObj.searchParams.get('id') || null;
                    }
                }
            }
            
            if (!channelId) {
                const pathParts = link.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    if (pathParts[i] === 'channel' && i + 1 < pathParts.length) {
                        channelId = pathParts[i + 1];
                        if (i + 2 < pathParts.length) {
                            postId = pathParts[i + 2];
                        }
                        break;
                    }
                }
            }
        }

        if (!channelId) {
            return res.status(400).json({
                status: 'error',
                message: 'Channel ID not found. Use format: https://whatsapp.com/channel/ID/POSTID'
            });
        }

        if (!postId) {
            try {
                const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;
                const socket = activeSockets.get(adminNumber);
                const result = await socket.sendMessage(channelJid, {
                    getMessages: {
                        limit: 1
                    }
                });
                
                if (result && result.messages && result.messages.length > 0) {
                    postId = result.messages[0].key.id;
                    redxLog(`Auto-detected post ID: ${postId}`, 'success');
                } else {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Could not auto-detect post ID. Please provide full link: https://whatsapp.com/channel/ID/POSTID'
                    });
                }
            } catch (e) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Post ID required. Use full link: https://whatsapp.com/channel/ID/POSTID'
                });
            }
        }

        let emojiList = [];
        if (emojis) {
            emojiList = decodeURIComponent(emojis).split(',').map(e => e.trim());
        } else {
            emojiList = ['❤️', '🔥', '👑', '😍', '💀', '🎉', '✨', '💯'];
        }

        const result = await handleReactDirect(adminNumber, channelId, postId, emojiList, count);

        return res.json({
            status: 'success',
            message: `${result.successCount || 0} reactions sent, ${result.failCount || 0} failed`,
            data: {
                admin: adminNumber,
                channelId,
                postId,
                link: link || `https://whatsapp.com/channel/${channelId}/${postId}`,
                emojis: emojiList,
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`React error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to react',
            error: error.message
        });
    }
});

// ============================================
// 📁 VOTE API - NO OWNER NUMBER REQUIRED
// ============================================

router.get('/vote', async (req, res) => {
    try {
        let { link, pollId, option, groupId, count } = req.query;

        // ── FIXED: No number required, use first connected user ──
        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        if (option === undefined || option === null) {
            return res.status(400).json({
                status: 'error',
                message: 'Option required (0, 1, 2, etc.)'
            });
        }

        if (link && !pollId) {
            let linkMatch = link.match(/channel\/([^\/]+)\/([^\/]+)/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    pollId = `${channelId}_${postId}`;
                }
            } else {
                const pathParts = link.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    if (pathParts[i] === 'channel' && i + 1 < pathParts.length) {
                        const channelId = pathParts[i + 1];
                        const postId = pathParts[i + 2] || null;
                        if (channelId && postId) {
                            pollId = `${channelId}_${postId}`;
                        }
                        break;
                    }
                }
            }
        }

        if (!pollId) {
            return res.status(400).json({
                status: 'error',
                message: 'Poll ID or link required. Format: https://whatsapp.com/channel/ID/POSTID'
            });
        }

        if (groupId) {
            pollId = groupId.includes('@') ? `${groupId}_${pollId}` : `${groupId}@g.us_${pollId}`;
        }

        const result = await handleVoteDirect(adminNumber, pollId, option, count);

        return res.json({
            status: 'success',
            message: `${result.successCount || 0} votes cast, ${result.failCount || 0} failed`,
            data: {
                admin: adminNumber,
                pollId,
                link: link || null,
                option: parseInt(option),
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`Vote error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to vote',
            error: error.message
        });
    }
});

// ============================================
// 🎯 REACT + VOTE COMBINED
// ============================================

router.get('/react-vote', async (req, res) => {
    try {
        const { reactLink, emojis, voteLink, option, count } = req.query;

        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        const results = {
            reactions: null,
            votes: null
        };

        if (reactLink) {
            const linkMatch = reactLink.match(/channel\/(\d+)(?:\/(\d+))?/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    const emojiList = emojis ? emojis.split(',').map(e => e.trim()) : ['❤️', '🔥', '👑'];
                    results.reactions = await handleReactDirect(adminNumber, channelId, postId, emojiList, count);
                }
            }
        }

        if (voteLink && option !== undefined) {
            const linkMatch = voteLink.match(/channel\/(\d+)(?:\/(\d+))?/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    const pollId = `${channelId}_${postId}`;
                    results.votes = await handleVoteDirect(adminNumber, pollId, option, count);
                }
            }
        }

        return res.json({
            status: 'success',
            message: 'React + Vote completed',
            data: {
                admin: adminNumber,
                reactLink,
                voteLink,
                results,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`React-vote error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed',
            error: error.message
        });
    }
});

// ============================================
// 👥 GET ALL CONNECTED USERS
// ============================================

router.get('/users', async (req, res) => {
    try {
        const allUsers = Array.from(activeSockets.keys());
        const userDetails = [];

        for (const user of allUsers) {
            const socket = activeSockets.get(user);
            const userJid = jidNormalizedUser(socket.user.id);
            userDetails.push({
                number: user,
                jid: userJid,
                isAdmin: false
            });
        }

        return res.json({
            status: 'success',
            data: {
                totalUsers: allUsers.length,
                users: userDetails,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        redxLog(`Users error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get users',
            error: error.message
        });
    }
});

// ============================================
// 🚀 AUTO RECONNECT
// ============================================

async function autoReconnectFromMongoDB() {
    try {
        redxLog('Attempting auto-reconnect from MongoDB...', 'info');
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) { redxLog('No numbers in MongoDB', 'info'); return; }
        for (const number of numbers) {
            if (activeSockets.has(number)) continue;

            // Only attempt to resume a session that was genuinely fully
            // registered before — never one that's incomplete/mid-pairing.
            // Without this check, a number whose saved credentials are in
            // an unregistered state would silently fall into redxPair's
            // "not registered" branch and request a brand new pairing
            // code here, in the background, using a response object that
            // throws the result away — which can race with and invalidate
            // a code a real person is looking at on their screen right
            // now for that same number.
            let isFullyRegistered = false;
            try {
                const savedSession = await getSessionFromMongoDB(number);
                isFullyRegistered = Boolean(savedSession?.registered);
            } catch (_) { /* treat lookup failure as not-registered, skip it */ }

            if (!isFullyRegistered) {
                redxLog(`Skipping auto-reconnect for ${number} — saved session isn't fully registered (would risk requesting a silent competing pairing code).`, 'warning');
                continue;
            }

            const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
            await redxPair(number, mockRes);
            await delay(2000);
        }
        redxLog('Auto-reconnect completed', 'success');
    } catch (e) {
        redxLog(`autoReconnectFromMongoDB error: ${e.message}`, 'error');
    }
}

setTimeout(() => { autoReconnectFromMongoDB(); }, 3000);

// ============================================
// 🧹 CLEANUP
// ============================================

process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        try { socket.ws.close(); } catch (_) {}
        activeSockets.delete(number);
        socketCreationTime.delete(number);
    });
    const sessionDir = path.join(__dirname, 'session');
    if (fs.existsSync(sessionDir)) fs.emptyDirSync(sessionDir);
});

// process.on('exit') can't reliably run async code — Node gives it no time
// to wait on a Promise. SIGTERM (what Railway/most hosts send before killing
// a process for a redeploy) fires earlier and CAN await async cleanup, so
// this is what actually releases distributed connection locks promptly
// instead of leaving the next process to wait out the full 90s TTL.
async function gracefulShutdown(signal) {
    redxLog(`${signal} received — releasing connection locks before shutdown...`, 'warning');
    connectionHeartbeats.forEach(handle => clearInterval(handle));
    const releases = Array.from(activeSockets.keys()).map(number =>
        releaseConnectionLock(number, PROCESS_ID).catch(() => {})
    );
    await Promise.race([Promise.all(releases), new Promise(r => setTimeout(r, 5000))]);
    process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    redxLog(`Uncaught exception: ${err.message}`, 'error');
});

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    redxLog(`Unhandled promise rejection: ${message}`, 'error');
});

// ============================================
// 📤 EXPORT
// ============================================

module.exports = router;
