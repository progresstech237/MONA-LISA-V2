
// ═══════════════════════════════════════════════════════════════════════════
//                    MONA LISA MINI BOT - CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// ============================================
// 🔥 MONA LISA BOT - COMPLETE SETTINGS
// 👑 Developer: PROGRESS TECH
// 🔥 GitHub Session System + All Features
// ============================================

const fs = require('fs');
const dotenv = require('dotenv');

// ──────────────────────────────────────────────
//  🔄 ENVIRONMENT LOADER
// ──────────────────────────────────────────────
if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

// ──────────────────────────────────────────────
//  📦 CONFIGURATION EXPORT
// ──────────────────────────────────────────────
module.exports = {

    // ═══════════════════════════════════════════
    //  🔐 SESSION & DATABASE
    // ═══════════════════════════════════════════

    /**
     * @description Session ID for bot authentication
     * @type {string}
     */
    SESSION_ID: process.env.SESSION_ID || "MINI BOT",

    // ═══════════════════════════════════════════
    //  🔥 GITHUB SETTINGS (MANDATORY)
    // ═══════════════════════════════════════════
    /** 
     * @description MongoDB Atlas connection string
     * @type {string}
     * @default "mongodb+srv://..."
     */
    MONGODB_URI: process.env.MONGODB_URI || '',

    // ═══════════════════════════════════════════════════════════════════════
    //  🤖 BOT IDENTITY
    // ═══════════════════════════════════════════════════════════════════════

    // ── Channel Settings ──
    CHANNEL_IDS: [
        '120363425282620066@newsletter'
    ],
    
    REACT_EMOJIS: [
        "🤍", "🥰", "🪸", "🖤", "💜", "💙", "💚", "💛", "🧡", "❤",
        "💝", "⚜️", "〽️", "🍫", "🍧", "🍨", "🍷", "🥃", "😘",
        "🤡", "🤤", "🤠", "🔥", "👑", "💯", "😍", "💖", "✨", "🎉"
    ],
    /**
     * @description Command prefix for bot interactions
     * @type {string}
     */
    PREFIX: process.env.PREFIX || '.',

    /**
     * @description Bot work mode
     * @type {('public'|'private'|'group'|'inbox')}
     */
    MODE: process.env.MODE || process.env.WORK_TYPE || 'public',

    /**
     * @description Display name of the bot
     * @type {string}
     */
    BOT_NAME: process.env.BOT_NAME || '🔥🥰𝑴𝑶𝑵𝑨 𝑳𝑰𝑺𝑨 𝑽𝟐🤭🔥',

    /**
     * @description Owner name
     * @type {string}
     */
    OWNER_NAME: process.env.OWNER_NAME || 'PROGRESS TECH',

    /**
     * @description Owner's WhatsApp numbers (multiple owners supported)
     * @type {string[]}
     */
    OWNER_NUMBER: process.env.OWNER_NUMBER ? 
        process.env.OWNER_NUMBER.split(',') : 
        ['237682432296'],

    /**
     * @description Who can use the .pair chat command to generate a pairing
     * code for a number from inside a chat (instead of the web /code page).
     * Defaults to owner-only, since generating a pairing code for a number
     * you don't control and getting the target to enter it is a known
     * account-takeover trick — the same class of issue this project's
     * previous .pair/.pair2 credential-harvesting commands caused. Set to
     * 'true' in .env only if you understand and accept that trade-off.
     * @type {string}
     */
    ALLOW_PUBLIC_PAIR_COMMAND: process.env.ALLOW_PUBLIC_PAIR_COMMAND || 'false',

    /**
     * @description Bot footer text
     * @type {string}
     */
    BOT_FOOTER: process.env.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ Progress Tech',

    // ═══════════════════════════════════════════
    //  👁️ STATUS AUTOMATION
    // ═══════════════════════════════════════════

    /**
     * @description Auto-view WhatsApp status updates
     * @type {string}
     */
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || 'true',

    /**
     * @description Auto-react to status updates
     * @type {string}
     */
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || 'true',

    /**
     * @description Emoji pool for auto-react feature
     * @type {string[]}
     */
    AUTO_STATUS_EMOJIS: ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'],

    /**
     * @description Auto-reply to status updates
     * @type {string}
     */
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || 'false',

    /**
     * @description Default message for status reply
     * @type {string}
     */
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || '❤️ Nice status!',

    // ═══════════════════════════════════════════
    //  💬 PRESENCE & CHAT SETTINGS
    // ═══════════════════════════════════════════

    /**
     * @description Mark messages as read (blue ticks)
     * @type {string}
     */
    READ_MESSAGE: process.env.READ_MESSAGE || 'false',

    /**
     * @description Show typing indicator in chat
     * @type {string}
     */
    AUTO_TYPING: process.env.AUTO_TYPING || 'false',

    /**
     * @description Show recording indicator in chat
     * @type {string}
     */
    AUTO_RECORDING: process.env.AUTO_RECORDING || 'false',

    /**
     * @description Always keep bot online
     * @type {string}
     */
    BOT_ONLINE: process.env.BOT_ONLINE || 'true',

    /**
     * @description Keep bot online with periodic updates
     * @type {string}
     */
    KEEP_ONLINE: process.env.KEEP_ONLINE || 'true',

    // ═══════════════════════════════════════════
    //  🛡️ ANTI-DELETE
    // ═══════════════════════════════════════════

    /**
     * @description Enable anti-delete (detect deleted messages)
     * @type {string}
     */
    ANTIDELETE: process.env.ANTIDELETE || 'false',
    ANTI_EDIT: process.env.ANTI_EDIT || 'false',

    /**
     * @description Send notification to owner when message is deleted
     * @type {string}
     */
    ANTIDELETE_NOTIFY: process.env.ANTIDELETE_NOTIFY || 'false',

    // ═══════════════════════════════════════════
    //  📵 ANTI-CALL
    // ═══════════════════════════════════════════

    /**
     * @description Reject incoming calls automatically
     * @type {string}
     */
    ANTI_CALL: process.env.ANTI_CALL || 'false',

    /**
     * @description Message sent when rejecting calls
     * @type {string}
     */
    REJECT_MSG: process.env.REJECT_MSG || '📵 Call rejected by bot',

    // ═══════════════════════════════════════════
    //  👥 GROUP MANAGEMENT
    // ═══════════════════════════════════════════

    /**
     * @description Send welcome message when new member joins
     * @type {string}
     */
    GROUP_WELCOME: process.env.GROUP_WELCOME || 'false',

    /**
     * @description Send goodbye message when member leaves
     * @type {string}
     */
    GROUP_GOODBYE: process.env.GROUP_GOODBYE || 'false',

    /**
     * @description Send promote message when member becomes admin
     * @type {string}
     */
    GROUP_PROMOTE: process.env.GROUP_PROMOTE || 'false',

    /**
     * @description Send demote message when member loses admin
     * @type {string}
     */
    GROUP_DEMOTE: process.env.GROUP_DEMOTE || 'false',

    /**
     * @description Custom welcome message
     * @type {string}
     */
    WELCOME_MESSAGE: process.env.WELCOME_MESSAGE || '👋 Welcome to the group!',

    /**
     * @description Custom goodbye message
     * @type {string}
     */
    GOODBYE_MESSAGE: process.env.GOODBYE_MESSAGE || '👋 Goodbye!',

    // ═══════════════════════════════════════════
    //  📢 CHANNEL SETTINGS
    // ═══════════════════════════════════════════

    /**
     * @description Channel to auto follow
     * @type {string}
     */
    CHANNEL_JID: process.env.CHANNEL_JID || '120363425282620066@newsletter',

    /**
     * @description Auto follow channel when bot connects
     * @type {string}
     */
    AUTO_FOLLOW_CHANNEL: process.env.AUTO_FOLLOW_CHANNEL || 'true',

    /**
     * @description Auto react on channel posts
     * @type {string}
     */
    AUTO_CHANNEL_REACT: process.env.AUTO_CHANNEL_REACT || 'true',

    /**
     * @description Emojis for auto channel react
     * @type {string[]}
     */
    AUTO_CHANNEL_REACT_EMOJIS: ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'],

    // ═══════════════════════════════════════════
    //  🎭 REACTION SETTINGS
    // ═══════════════════════════════════════════

    /**
     * @description Auto react to messages
     * @type {string}
     */
    CUSTOM_REACT: process.env.CUSTOM_REACT || 'false',

    /**
     * @description Emoji pool for custom reaction
     * @type {string}
     */
    CUSTOM_REACT_EMOJIS: process.env.CUSTOM_REACT_EMOJIS || '💕,👑,♥️,🇵🇰,👑,😘,❤️,🦁,☺️,💫,👍🏻,🙂',

    /**
     * @description Send message when unknown command is used
     * @type {string}
     */
    SEND_UNKNOWN_COMMAND: process.env.SEND_UNKNOWN_COMMAND || 'true',

    // ═══════════════════════════════════════════
    //  🖼️ MEDIA & LINKS
    // ═══════════════════════════════════════════

    /**
     * @description Default bot profile image path/URL
     * @type {string}
     */
    IMAGE_PATH: process.env.IMAGE_PATH || 'https://files.catbox.moe/4dwiou.png',

    /**
     * @description WhatsApp channel link for updates
     * @type {string}
     */
    CHANNEL_LINK: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P',

    /**
     * @description WhatsApp group invite link
     * @type {string}
     */
    GROUP_LINK: process.env.GROUP_LINK || 'https://chat.whatsapp.com/K1Fa4abSnWO5uVkcwApbaC',

    /**
     * @description Owner WhatsApp link
     * @type {string}
     */
    OWNER_LINK: process.env.OWNER_LINK || 'https://wa.me/237682432296',

    /**
     * @description Repository link
     * @type {string}
     */
    REPO: process.env.REPO || 'https://github.com/progresstech237/MONA-LISA-Mini',

    // ═══════════════════════════════════════════
    //  🐛 DEBUG & LOGGING
    // ═══════════════════════════════════════════

    /**
     * @description Enable debug mode
     * @type {string}
     */
    DEBUG: process.env.DEBUG || 'false',

    /**
     * @description Enable logging
     * @type {string}
     */
    LOGGING_ENABLED: process.env.LOGGING_ENABLED || 'true',

    // ═══════════════════════════════════════════
    //  📡 BAILEYS
    // ═══════════════════════════════════════════

    /**
     * @description Baileys package name
     * @type {string}
     */
    BAILEYS: '@whiskeysockets/baileys',

    // ═══════════════════════════════════════════
    //  🔗 TELEGRAM (Optional)
    // ═══════════════════════════════════════════

    /**
     * @description Telegram bot token for notifications
     * @type {string}
     */
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',

    /**
     * @description Telegram chat ID for sending notifications
     * @type {string}
     */
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''

};

// ──────────────────────────────────────────────
//  📖 USAGE EXAMPLE
// ──────────────────────────────────────────────

/**
 * @example
 * // Import configuration
 * const config = require('./settings');
 * 
 * // Access bot settings
 * console.log(`Bot: ${config.BOT_NAME}`);
 * console.log(`Prefix: ${config.PREFIX}`);
 * console.log(`Owner: ${config.OWNER_NUMBER}`);
 * 
 * // Check if auto-view status is enabled
 * if (config.AUTO_STATUS_SEEN === 'true') {
 *     console.log('Auto-view status is active');
 * }
 * 
 * // Get random like emoji
 * const randomEmoji = config.AUTO_STATUS_EMOJIS[Math.floor(Math.random() * config.AUTO_STATUS_EMOJIS.length)];
 */

// ──────────────────────────────────────────────
//  🏷️ EXPORT METADATA
// ──────────────────────────────────────────────

/**
 * @module settings
 * @description MONA LISA MINI Configuration Module
 * @version 2.0.0
 * @author Progress Tech
 * @license MIT
 */
