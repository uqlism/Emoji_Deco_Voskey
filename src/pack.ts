import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

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

const VO_TEMPLATE ={
  "enable": true,
  "args": [
    {
      "value_type": "string",
      "default": "",
      "label": "<code>"
    },
    {
      "value_type": "string",
      "default": "",
      "label": "<path>"
    },
    {
      "value_type": "string",
      "default": "",
      "label": "<format>"
    },
    {
      "value_type": "number",
      "default": 8,
      "label": "<width>"
    }
  ],
  "display": {
    "text": "",
    "hoverEvent": {
      "action": "show_text",
      "contents": {
        "type": "emoji_deco:arg",
        "index": 0
      }
    },
    "color": "#ffffff",
    "extra": [
      {
        "type": "emoji_deco:image_to_glyph",
        "width": {
          "type": "emoji_deco:arg",
          "index": 3
        },
        "height": 8,
        "image": {
          "type": "emoji_deco:decode_image",
          "format": {
            "type": "emoji_deco:arg",
            "index": 2
          },
          "source": {
            "type": "emoji_deco:fetch_url",
            "url": {
              "type": "emoji_deco:join",
              "parts": [
                "https://voskeyfiles.icalo.net/drv/",
                {
                  "type": "emoji_deco:arg",
                  "index": 1
                }
              ]
            }
          }
        }
      }
    ]
  }
}

export async function writePackMeta(outDir: string): Promise<void> {
  await writeFile(
    path.join(outDir, 'pack.mcmeta'),
    JSON.stringify({ pack: { pack_format: 15, description: 'Vosky Emoji Pack' } }, null, 2),
  );
  await writeFile(
    path.join(outDir, 'assets', 'emoji_deco', 'shortcodes', 'vo_template.json'),
    JSON.stringify(VO_TEMPLATE, null, 2),
  );
}

export async function writeShortcode(
  outDir: string,
  name: string,
  aliases: string[],
  imagePath: string,
  format: string,
  width: number,
): Promise<void> {
  const shortcode = {
    enable: true,
    aliases,
    display: {
      type: 'emoji_deco:apply_shortcode',
      shortcode: 'vo_template',
      args: [name, imagePath, format, width],
    },
  };
  const dest = path.join(outDir, 'assets', 'emoji_deco', 'shortcodes', `${name}.json`);
  await writeFile(dest, JSON.stringify(shortcode));
}
