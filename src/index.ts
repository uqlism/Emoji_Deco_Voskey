import { fetchEmojiList, fetchImageSize, type MisskeyEmoji } from './api.ts';
import { sanitizeName, createDirectories, writePackMeta, writeShortcode, calcWidth } from './pack.ts';
import { createZip } from './zip.ts';

const VOSKY_BASE = process.env.VOSKY_URL ?? 'https://voskey.icalo.net';
const OUT_DIR = process.env.OUT_DIR ?? './output';
const OUT_ZIP = process.env.OUT_ZIP ?? 'emoji_deco_voskey_1.20.1.zip';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);
const DRV_BASE = 'https://voskeyfiles.icalo.net/drv/';

async function processEmoji(emoji: MisskeyEmoji): Promise<void> {
  const name = sanitizeName(emoji.name);
  const { width: imgW, height: imgH, format } = await fetchImageSize(emoji.url);
  const width = calcWidth(imgW, imgH);
  const imagePath = emoji.url.startsWith(DRV_BASE) ? emoji.url.slice(DRV_BASE.length) : emoji.url;
  await writeShortcode(OUT_DIR, name, emoji.aliases, imagePath, format, width);
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
  onDone: (item: T, err?: unknown) => void,
): Promise<void> {
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        await fn(item);
        onDone(item);
      } catch (err) {
        onDone(item, err);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main(): Promise<void> {
  console.log(`Vosky URL  : ${VOSKY_BASE}`);
  console.log(`Output     : ${OUT_DIR}`);
  console.log();

  await createDirectories(OUT_DIR);
  await writePackMeta(OUT_DIR);

  console.log('Fetching emoji list…');
  const emojis = await fetchEmojiList(VOSKY_BASE);
  console.log(`Found ${emojis.length} emojis\n`);

  let done = 0;
  let failed = 0;

  await runPool(
    emojis,
    CONCURRENCY,
    processEmoji,
    (emoji, err) => {
      if (err) {
        failed++;
        console.error(`  FAIL  ${emoji.name}: ${err}`);
      } else {
        done++;
        process.stdout.write(`  OK  ${emoji.name}\n`);
      }
    },
  );

  console.log(`\nDone: ${done} ok, ${failed} failed`);

  const zipPath = OUT_ZIP;
  console.log(`\nCreating ${zipPath} …`);
  const zipSize = await createZip(OUT_DIR, zipPath);
  const mb = (zipSize / 1024 / 1024).toFixed(2);
  console.log(`zip: ${mb} MB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
