import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** Sanitise an emoji name to a valid Minecraft resource path segment [a-z0-9_.-]. */
export function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_.\-]/g, '_');
}

/** Calculate shortcode width from image aspect ratio (height fixed at 8). */
export function calcWidth(imgWidth: number, imgHeight: number): number {
  return Math.max(1, Math.round((imgWidth / imgHeight) * 8));
}

export async function createDirectories(outDir: string): Promise<void> {
  await mkdir(path.join(outDir, 'assets', 'emoji_deco', 'shortcodes'), { recursive: true });
}

const DISPLAY_COMMON = (urlNode: object) => ({
  type: 'emoji_deco:style',
  color: '#ffffff',
  contents: {
    type: 'emoji_deco:hover/text',
    hover_contents: [
      {
        type: 'emoji_deco:scale',
        x: 4,
        y: 4,
        contents: {
          type: 'emoji_deco:image_to_glyph',
          width: { type: 'emoji_deco:arg', index: 2 },
          height: 8,
          image: {
            type: 'emoji_deco:decode_image',
            source: { type: 'emoji_deco:fetch_url', disk_cache: true, url: urlNode },
          },
        },
      },
      {
        type: 'emoji_deco:join',
        parts: [':', { type: 'emoji_deco:arg', index: 0 }, ':'],
      },
    ],
    contents: [
      {
        type: 'emoji_deco:image_to_glyph',
        width: { type: 'emoji_deco:arg', index: 2 },
        height: 8,
        image: {
          type: 'emoji_deco:decode_image',
          source: { type: 'emoji_deco:fetch_url', disk_cache: true, url: urlNode },
        },
      },
    ],
  },
});

const ARGS_COMMON = (pathLabel: string) => [
  { value_type: 'string', default: '', label: '<code>' },
  { value_type: 'string', default: '', label: pathLabel },
  { value_type: 'number', default: 8, label: '<width>' },
];

const VO_DRV = {
  enable: true,
  args: ARGS_COMMON('<path>'),
  display: DISPLAY_COMMON({
    type: 'emoji_deco:join',
    parts: ['https://voskeyfiles.icalo.net/drv/', { type: 'emoji_deco:arg', index: 1 }],
  }),
};

const VO_FILES = {
  enable: true,
  args: ARGS_COMMON('<id>'),
  display: DISPLAY_COMMON({
    type: 'emoji_deco:join',
    parts: ['https://voskey.icalo.net/files/', { type: 'emoji_deco:arg', index: 1 }],
  }),
};

export async function writePackIcon(outDir: string, imageUrl: string): Promise<void> {
  const res = await fetch(imageUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf, { pages: 1 }).resize(128, 128).png().toBuffer();
  await writeFile(path.join(outDir, 'pack.png'), png);
}

export async function writePackMeta(outDir: string): Promise<void> {
  const sc = path.join(outDir, 'assets', 'emoji_deco', 'shortcodes');
  await Promise.all([
    writeFile(
      path.join(outDir, 'pack.mcmeta'),
      JSON.stringify({ pack: { pack_format: 15, description: 'Vosky Emoji Pack' } }, null, 2),
    ),
    writeFile(path.join(sc, 'vo_drv.json'), JSON.stringify(VO_DRV, null, 2)),
    writeFile(path.join(sc, 'vo_files.json'), JSON.stringify(VO_FILES, null, 2)),
  ]);
}

export async function writeUrlAllowlist(outDir: string, domains: string[]): Promise<void> {
  await writeFile(
    path.join(outDir, 'assets', 'emoji_deco', 'url_allowlist.json'),
    JSON.stringify({ allowed_domains: [...domains].sort() }, null, 2),
  );
}

export async function writeShortcode(
  outDir: string,
  name: string,
  aliases: string[],
  imageArg: string,
  width: number,
  template: 'vo_drv' | 'vo_files' = 'vo_drv',
): Promise<void> {
  const args: (string | number)[] = [name, imageArg];
  if (width !== 8) args.push(width);
  const shortcode: Record<string, unknown> = {
    display: {
      type: 'emoji_deco:apply_shortcode',
      shortcode: template,
      args,
    },
  };
  if (aliases.length > 0) shortcode.aliases = aliases;
  const dest = path.join(outDir, 'assets', 'emoji_deco', 'shortcodes', `${name}.json`);
  await writeFile(dest, JSON.stringify(shortcode));
}
