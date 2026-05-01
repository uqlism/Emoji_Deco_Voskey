# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

Generates a Minecraft resource pack for the [Emoji & Deco](https://modrinth.com/mod/emoji-deco) mod, populated with every custom emoji from the [Voskey](https://voskey.icalo.net) Misskey instance. The pack is a ZIP file containing shortcode JSON files that reference emoji images hosted on the Voskey CDN.

## Commands

```bash
bun start                        # run the generator (fetches ~11k emojis, writes output/, zips it)
bun run src/index.ts             # same
```

Environment variables (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `VOSKY_URL` | `https://voskey.icalo.net` | Misskey instance base URL |
| `OUT_DIR` | `./output` | Directory for the unpacked resource pack |
| `OUT_ZIP` | `emoji_deco_voskey_1.20.1.zip` | Output zip filename |
| `CONCURRENCY` | `50` | Parallel image-fetch workers |

## Architecture

```
src/
  index.ts   — entry point: fetches emoji list, runs concurrency pool, calls zip
  api.ts     — Voskey API: fetchEmojiList, fetchImageSize (256-byte Range request)
  pack.ts    — pack generation: template constants, writePackMeta, writeShortcode
  zip.ts     — streaming fflate ZIP writer
```

**Pipeline:** `fetchEmojiList` → concurrency pool of `processEmoji` → `fetchImageSize` + `writeShortcode` → `createZip`

## Emoji URL routing

Voskey emojis come from two hosts; each maps to a different shortcode template:

| Host | Template | arg[1] |
|---|---|---|
| `voskeyfiles.icalo.net/drv/<path>` | `vo_drv` | path after `/drv/` |
| `voskey.icalo.net/files/<id>` | `vo_files` | id after `/files/` |

Any URL matching neither host throws an error (caught per-emoji by the pool and logged as `FAIL`).

## Shortcode template format (emoji_deco mod)

Templates live in `assets/emoji_deco/shortcodes/`. The display node structure uses `emoji_deco:style` → `emoji_deco:hover/text` → `emoji_deco:image_to_glyph`. Args are positional: index 0 = shortcode name, index 1 = path/id, index 2 = width (default 8, omitted if square).

Individual shortcode files omit `enable` and `aliases` when using defaults, and omit width arg when it equals 8 (square emoji).
