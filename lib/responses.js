// ═══════════════════════════════════════════════════════════════════════════
//   🥰 MONA LISA 🤭 — RESPONSE / PERSONALITY SYSTEM
//   Powered by Progress Tech
//
//   A small, reusable set of helpers so every plugin can speak in a
//   consistent MONA LISA voice — elegant, mysterious, a little playful —
//   without repeating the same sentence over and over.
//
//   Usage in a plugin:
//     const { success, error, loading, warning } = require('../lib/responses');
//     await reply(success("Sticker created!"));
//     await reply(error("That link looks invalid."));
// ═══════════════════════════════════════════════════════════════════════════

const SUCCESS_LINES = [
    '✨ Mona Lisa smiles... your request was completed beautifully.',
    '🖼️ The masterpiece is ready, darling. 🤭✨',
    '👑 MONA LISA approves this result.',
    '🌹 A perfect touch from the legendary smile.',
    '💎 Painted to perfection, just for you.',
    '🎨 Another masterpiece signed by MONA LISA.',
    '🤭 Effortless, elegant, done.',
];

const ERROR_LINES = [
    '😌 Mona Lisa noticed something went wrong... let\'s fix it.',
    '🖼️ Even masterpieces need a second attempt. Please try again.',
    '🤭 That command didn\'t go as planned, but MONA LISA is still smiling.',
    '🌹 The mysterious smile detected an error. Please check your request.',
    '💔 A tiny crack in the canvas — let\'s try that again.',
];

const LOADING_LINES = [
    '🖼️ Mona Lisa is preparing your request...',
    '🎨 Mixing the colors, one moment...',
    '👑 The legendary smile is at work...',
    '✨ Painting your masterpiece...',
];

const WARNING_LINES = [
    '🌹 A gentle notice from MONA LISA...',
    '😌 Just a small thing before we continue...',
    '🤭 One moment — something needs your attention.',
];

function pick(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Wrap a success message with a random MONA LISA success line. */
function success(text) {
    return text ? `${pick(SUCCESS_LINES)}\n\n${text}` : pick(SUCCESS_LINES);
}

/** Wrap an error message with a random MONA LISA error line. */
function error(text) {
    return text ? `${pick(ERROR_LINES)}\n\n${text}` : pick(ERROR_LINES);
}

/** A standalone loading/progress line. */
function loading(text) {
    return text ? `${pick(LOADING_LINES)}\n${text}` : pick(LOADING_LINES);
}

/** Wrap a warning message with a random MONA LISA warning line. */
function warning(text) {
    return text ? `${pick(WARNING_LINES)}\n\n${text}` : pick(WARNING_LINES);
}

/** Standard footer appended to feature-rich replies (menu, alive, etc). */
function footer(config) {
    return `\n\n> 🥰 *MONA LISA* 🤭 · Powered by ${config?.OWNER_NAME || 'Progress Tech'}`;
}

module.exports = { success, error, loading, warning, footer, pick, SUCCESS_LINES, ERROR_LINES, LOADING_LINES, WARNING_LINES };
