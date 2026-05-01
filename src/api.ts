
export interface MisskeyEmoji {
  name: string;
  url: string;
  aliases: string[];
  category: string | null;
  sensitive?: boolean;
}

import sizeOf from 'image-size';

function detectFormat(buf: Buffer): string {
  // PNG signature: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    // APNG has an acTL chunk before the first IDAT; it appears right after IHDR (offset 33+).
    // Search from offset 33 (end of PNG signature + IHDR chunk).
    const acTL = Buffer.from([0x61, 0x63, 0x54, 0x4c]);
    return buf.indexOf(acTL, 33) !== -1 ? 'apng' : 'png';
  }
  // GIF signature: 47 49 46
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'webp';
  return 'png';
}

/**
 * Fetch only the first 256 bytes of an image (via Range header) and return its dimensions and format.
 * Falls back to a full download if the server doesn't support Range requests.
 */
export async function fetchImageSize(url: string): Promise<{ width: number; height: number; format: string }> {
  const res = await fetch(url, { headers: { Range: 'bytes=0-255' } });
  const buf = Buffer.from(await res.arrayBuffer());
  const { width = 1, height = 1 } = sizeOf(buf);
  const format = detectFormat(buf);
  return { width, height, format };
}

export async function fetchEmojiList(baseUrl: string): Promise<MisskeyEmoji[]> {
  const res = await fetch(`${baseUrl}/api/emojis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { emojis: MisskeyEmoji[] };
  return data.emojis;
}

