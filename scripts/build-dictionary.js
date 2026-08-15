#!/usr/bin/env node
/**
 * scripts/build-dictionary.js
 *
 * Converts JMdict_e (the EDRDG Japanese-English dictionary XML file) into
 * assets/dictionary.db -- a small, indexed, read-only SQLite database that
 * ships as a bundled asset and is imported on first launch via expo-sqlite
 * (see app/_layout.tsx and src/services/dictionary/LocalDictionaryService.ts).
 *
 * USAGE
 *   node scripts/build-dictionary.js [path/to/JMdict_e]
 *
 * If no path is given (or the file isn't found), this generates a SMALL
 * SEED dictionary instead, containing enough common words to run the app
 * and its offline test plan end-to-end. This lets you verify the whole
 * pipeline (tokenizer -> dictionary -> storage -> PROCESS_TEXT) before
 * spending the time to download and convert the full ~190k-entry JMdict.
 *
 * GETTING THE REAL FILE
 *   JMdict_e is public domain / Creative Commons Attribution-ShareAlike,
 *   published by the Electronic Dictionary Research and Development Group:
 *     http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
 *   Download it, gunzip it, then run this script against the extracted file.
 *   (Note: the uploaded reference project's data/JMdict_e file was empty --
 *   this script was not able to build the full dictionary from it. You'll
 *   need to fetch JMdict_e yourself.)
 *
 * WHY SQLITE, NOT JSON
 *   See the header comment in LocalDictionaryService.ts.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { DatabaseSync } = require('node:sqlite'); // Node 22+, build-time only -- never ships in the app

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_INPUT = path.resolve(ROOT, 'data', 'JMdict_e');
const OUTPUT_PATH = path.resolve(ROOT, 'assets', 'dictionary.db');

// ---------------------------------------------------------------------------
// JMdict <pos> entity codes -> our coarse PartOfSpeech categories.
// Not exhaustive of every JMdict tag, but covers the common ones. Anything
// unrecognized falls back to 'other' rather than crashing the build.
// ---------------------------------------------------------------------------
const POS_MAP = {
  n: 'noun', 'n-adv': 'noun', 'n-t': 'noun', 'n-pr': 'noun', 'n-suf': 'noun', 'n-pref': 'noun',
  pn: 'noun',
  v1: 'verb', 'v1-s': 'verb', v5: 'verb', v5u: 'verb', v5k: 'verb', v5g: 'verb', v5s: 'verb',
  v5t: 'verb', v5n: 'verb', v5b: 'verb', v5m: 'verb', v5r: 'verb', v5aru: 'verb',
  vs: 'verb', 'vs-i': 'verb', 'vs-s': 'verb', vk: 'verb', vz: 'verb', vi: 'verb', vt: 'verb',
  'adj-i': 'adjective', 'adj-na': 'adjective', 'adj-no': 'adjective', 'adj-pn': 'adjective',
  'adj-f': 'adjective', 'adj-ix': 'adjective',
  adv: 'adverb', 'adv-to': 'adverb',
  prt: 'particle',
  conj: 'conjunction',
  int: 'interjection',
  pref: 'prefix',
  suf: 'suffix',
  aux: 'auxiliary', 'aux-v': 'auxiliary', 'aux-adj': 'auxiliary',
  exp: 'other',
};

function mapPos(code) {
  return POS_MAP[code] || 'other';
}

function innerText(line) {
  return line.replace(/<[^>]+>/g, '').trim();
}

function unescapeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function isEnglishGloss(attrString) {
  const m = attrString.match(/xml:lang=["']([^"']+)["']/i);
  return !m || m[1].trim().toLowerCase() === 'eng';
}

/**
 * JMdict <pos> lines look like "<pos>&v1;</pos>" -- the &code; is a custom
 * DTD entity, not a real XML entity, so a plain text scan (not a validating
 * parser) sees it as literal text. Extract the bare code.
 */
function extractPosCode(line) {
  const m = line.match(/<pos>&([a-zA-Z0-9-]+);<\/pos>/);
  return m ? m[1] : null;
}

async function convertFromJMdict(inputPath, db) {
  const insert = db.prepare(
    `INSERT INTO entries (kanji, kana, meanings, pos) VALUES (?, ?, ?, ?)`
  );

  let entry = null;
  let inKEle = false;
  let inREle = false;
  let inSense = false;
  let entryCount = 0;
  let savedCount = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  db.exec('BEGIN TRANSACTION');

  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) continue;

    if (line === '<entry>') {
      entry = { kanji: [], kana: [], meanings: [], pos: new Set() };
      inKEle = inREle = inSense = false;
      continue;
    }

    if (line === '</entry>') {
      if (entry) {
        entryCount++;
        const kanji = entry.kanji[0] ?? null;
        const kana = entry.kana[0] ?? '';
        if ((kanji || kana) && entry.meanings.length > 0) {
          insert.run(
            kanji,
            kana,
            JSON.stringify(entry.meanings),
            JSON.stringify(Array.from(entry.pos))
          );
          savedCount++;
        }
      }
      entry = null;
      continue;
    }

    if (!entry) continue;

    if (line === '<k_ele>') { inKEle = true; continue; }
    if (line === '</k_ele>') { inKEle = false; continue; }
    if (line === '<r_ele>') { inREle = true; continue; }
    if (line === '</r_ele>') { inREle = false; continue; }
    if (line === '<sense>') { inSense = true; continue; }
    if (line === '</sense>') { inSense = false; continue; }

    if (inKEle && line.startsWith('<keb>')) {
      if (entry.kanji.length === 0) {
        const text = unescapeXml(innerText(line));
        if (text) entry.kanji.push(text);
      }
      continue;
    }

    if (inREle && line.startsWith('<reb>')) {
      if (entry.kana.length === 0) {
        const text = unescapeXml(innerText(line));
        if (text) entry.kana.push(text);
      }
      continue;
    }

    if (inSense && line.startsWith('<pos>')) {
      const code = extractPosCode(line);
      if (code) entry.pos.add(mapPos(code));
      continue;
    }

    if (inSense && line.startsWith('<gloss')) {
      const m = line.match(/^<gloss([^>]*)>(.*?)<\/gloss>$/);
      if (m) {
        const [, attrs, rawText] = m;
        if (isEnglishGloss(attrs)) {
          const text = unescapeXml(rawText.trim());
          if (text) entry.meanings.push(text);
        }
      }
      continue;
    }
  }

  db.exec('COMMIT');
  return { entryCount, savedCount };
}

// ---------------------------------------------------------------------------
// Seed fallback -- enough to run the app and the offline test plan without
// waiting on the full JMdict download.
// ---------------------------------------------------------------------------
const SEED_ENTRIES = [
  { kanji: null, kana: 'こんにちは', meanings: ['hello', 'good afternoon'], pos: ['interjection'] },
  { kanji: null, kana: 'ありがとう', meanings: ['thank you'], pos: ['interjection'] },
  { kanji: '日本語', kana: 'にほんご', meanings: ['Japanese language'], pos: ['noun'] },
  { kanji: '勉強', kana: 'べんきょう', meanings: ['study', 'diligence'], pos: ['noun'] },
  { kanji: '勉強する', kana: 'べんきょうする', meanings: ['to study'], pos: ['verb'] },
  { kanji: '食べる', kana: 'たべる', meanings: ['to eat'], pos: ['verb'] },
  { kanji: '飲む', kana: 'のむ', meanings: ['to drink'], pos: ['verb'] },
  { kanji: '買う', kana: 'かう', meanings: ['to buy'], pos: ['verb'] },
  { kanji: '書く', kana: 'かく', meanings: ['to write'], pos: ['verb'] },
  { kanji: '行く', kana: 'いく', meanings: ['to go'], pos: ['verb'] },
  { kanji: '大きい', kana: 'おおきい', meanings: ['big', 'large'], pos: ['adjective'] },
  { kanji: '小さい', kana: 'ちいさい', meanings: ['small', 'little'], pos: ['adjective'] },
  { kanji: '大丈夫', kana: 'だいじょうぶ', meanings: ['okay', 'all right', 'safe'], pos: ['adjective'] },
  { kanji: '私', kana: 'わたし', meanings: ['I', 'me'], pos: ['noun'] },
  { kanji: 'いる', kana: 'いる', meanings: ['to be (animate)', 'to exist'], pos: ['verb'] },
  { kanji: null, kana: 'を', meanings: ['(direct object marker)'], pos: ['particle'] },
  { kanji: null, kana: 'は', meanings: ['(topic marker)'], pos: ['particle'] },
  { kanji: null, kana: 'て', meanings: ['(connective particle)'], pos: ['particle'] },
  { kanji: '東京', kana: 'とうきょう', meanings: ['Tokyo'], pos: ['noun'] },
  { kanji: '学校', kana: 'がっこう', meanings: ['school'], pos: ['noun'] },
];

function buildSeed(db) {
  const insert = db.prepare(
    `INSERT INTO entries (kanji, kana, meanings, pos) VALUES (?, ?, ?, ?)`
  );
  db.exec('BEGIN TRANSACTION');
  for (const e of SEED_ENTRIES) {
    insert.run(e.kanji, e.kana, JSON.stringify(e.meanings), JSON.stringify(e.pos));
  }
  db.exec('COMMIT');
  return { entryCount: SEED_ENTRIES.length, savedCount: SEED_ENTRIES.length };
}

// ---------------------------------------------------------------------------
async function main() {
  const inputArg = process.argv[2];
  const inputPath = inputArg ? path.resolve(process.cwd(), inputArg) : DEFAULT_INPUT;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  if (fs.existsSync(OUTPUT_PATH)) fs.rmSync(OUTPUT_PATH);

  const db = new DatabaseSync(OUTPUT_PATH);
  db.exec(`
    CREATE TABLE entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kanji TEXT,
      kana TEXT NOT NULL,
      meanings TEXT NOT NULL,
      pos TEXT NOT NULL
    );
  `);

  let stats;
  const haveRealFile = fs.existsSync(inputPath) && fs.statSync(inputPath).size > 1000;

  if (haveRealFile) {
    console.log(`Input  : ${inputPath}`);
    stats = await convertFromJMdict(inputPath, db);
  } else {
    console.log(`No JMdict file found at ${inputPath} (or it's empty/too small).`);
    console.log('Building the small SEED dictionary instead -- see the header of this');
    console.log('script for how to get the full JMdict_e file.');
    stats = buildSeed(db);
  }

  db.exec('CREATE INDEX idx_kanji ON entries(kanji);');
  db.exec('CREATE INDEX idx_kana ON entries(kana);');
  db.close();

  const sizeKB = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
  console.log(`✓ Entries parsed : ${stats.entryCount.toLocaleString()}`);
  console.log(`✓ Entries saved  : ${stats.savedCount.toLocaleString()}`);
  console.log(`✓ Output         : ${OUTPUT_PATH} (${sizeKB.toLocaleString()} KB)`);
}

main().catch((err) => {
  console.error('Dictionary build failed:', err);
  process.exit(1);
});
