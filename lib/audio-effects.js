// ═══════════════════════════════════════════════════════════════════════════
//   🎧 AUDIO EFFECTS HELPER — MONA LISA
//   Local ffmpeg processing only — no external API, nothing to configure.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const crypto = require('crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

// Standard, well-established ffmpeg audio filters only — nothing exotic.
const FILTERS = {
    bass: 'bass=g=15',
    nightcore: 'asetrate=44100*1.25,aresample=44100',
    slow: 'atempo=0.75',
    fast: 'atempo=1.5',
    reverse: 'areverse',
    deep: 'asetrate=44100*0.85,aresample=44100',
    smooth: 'lowpass=f=4000',
    squirrel: 'asetrate=44100*1.5,aresample=44100',
    eightd: 'apulsator=hz=0.09',
    blown: 'volume=6,alimiter=limit=0.9',
};

/**
 * Apply a named audio effect to an audio buffer.
 * @param {Buffer} inputBuffer
 * @param {keyof FILTERS} effectName
 * @returns {Promise<Buffer>} processed audio as MP3
 */
async function applyEffect(inputBuffer, effectName) {
    const filter = FILTERS[effectName];
    if (!filter) throw new Error(`Unknown audio effect: ${effectName}`);

    const inputPath = path.join(tmpdir(), crypto.randomBytes(6).toString('hex') + '.input');
    const outputPath = path.join(tmpdir(), crypto.randomBytes(6).toString('hex') + '.mp3');
    fs.writeFileSync(inputPath, inputBuffer);

    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters(filter)
            .toFormat('mp3')
            .on('error', reject)
            .on('end', resolve)
            .save(outputPath);
    });

    const outBuffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    return outBuffer;
}

module.exports = { applyEffect, FILTERS };
