
export interface MisskeyEmoji {
  name: string;
  url: string;
  aliases: string[];
  category: string | null;
  sensitive?: boolean;
}

import sizeOf from 'image-size';

/**
 * Fetch only the first 256 bytes of an image (via Range header) and return its dimensions.
 * Falls back to a full download if the server doesn't support Range requests.
 */
export async function fetchImageSize(url: string): Promise<{ width: number; height: number }> {
  const res = await fetch(url, { headers: { Range: 'bytes=0-255' } });
  const buf = Buffer.from(await res.arrayBuffer());
  const { width = 1, height = 1 } = sizeOf(buf);
  return { width, height };
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

