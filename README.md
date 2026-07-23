# Motherlode Texture Workshop

Public art-contribution site for [Motherlode](https://github.com/glowarts/MotherlodeMC).
Browse every block and item texture in the mod, see which ones still need real
art, and submit your own.

**→ [Open the workshop](https://glowarts.github.io/MotherlodeTextureHub/)**

Submissions arrive as GitHub issues with the PNG attached. There is no server,
no account beyond GitHub, and no API keys.

## For contributors

Read the style guide on the site before drawing. In short: 16×16 PNG, tight
palette, no gradients or anti-aliasing, your own work only. Every texture page
shows the rest of its material family and the same variant across other
materials — match those.

## For the maintainer

This whole folder is generated. Do not hand-edit `data/`, `textures/`,
`index.html`, `app.js` or `style.css` — regenerate instead.

**After changing any texture in the mod, run this from the mod repo:**

```
.\tools\texture_site\publish.ps1
```

That regenerates the catalog, copies the PNGs, commits and pushes. Pages
redeploys within a minute. Asset URLs carry a content hash, so returning
visitors pick up the new build without hard-refreshing.

Add `-DryRun` to see what would change without publishing. The underlying
generator can also be run on its own:

```
python tools/texture_site/build_site.py --out ../MotherlodeTextureHub
```

Two files are yours to edit and are never overwritten:

- **`config.js`** — the GitHub owner/repo that receives submissions. Set once.
- **`status.json`** — status overrides. This is the only manual bookkeeping.

### status.json

The generator guesses status automatically:

| Status | How it is decided |
| --- | --- |
| `missing` | A model references the texture but no PNG exists. |
| `placeholder` | Its pixel layout is shared with 4+ other textures, or it is a flat fill of ≤2 colours. |
| `unreviewed` | A real-looking PNG exists but you haven't signed it off. |
| `done` | You listed it under `done`. |

Placeholders are found by **structure, not colour**. Each pixel is replaced by
the index of its colour in order of first appearance, and that grid is hashed —
so a green checkerboard and a blue one produce the same fingerprint, and both
get caught. Recolouring a stock pattern does not disguise it. Real art never
collides this way; two hand-drawn tiles do not share a pixel-exact layout.

That catches the two stock patterns already in the mod (a flat fill and a
bordered 4×4 checkerboard). A placeholder drawn from scratch, one-of-a-kind,
will *not* be caught — flag those by hand under `placeholder`.

```json
{
  "done": [
    "adamantite",
    "item/amber"
  ],
  "placeholder": [
    "adamantite_ore",
    "block/cryptstone"
  ],
  "removed": [
    "cobblestone"
  ],
  "notes": {
    "block/cryptstone": "Drawn, but too saturated next to the rest of the family."
  }
}
```

Every list matches either a **single id** (`block/cryptstone`) or a whole
**family** (`adamantite` covers `adamantite_bricks`, `adamantite_slab` and the
other thirteen). Families keep this file short — flagging a material by hand
would otherwise mean typing out 35 ids.

`placeholder` wins over `done`, so the example above marks all fifteen
adamantite textures finished *except* `adamantite_ore`, which stays flagged.
That is the usual shape: sign off a material, then pull back the one or two you
are not happy with.

`notes` shows up on the texture's page, so use it to say what is wrong.

`removed` drops a block from the catalog entirely. You need it when a block is
deleted from the mod but its generated model data is still around — the model
still references a texture that will never exist, so the block would otherwise
sit in the list forever as `missing` and someone would draw art for it. Entries
match a whole family (`cobblestone` covers `cobblestone_bricks`, `cobblestone_slab`
and so on) or a single id (`block/cobblestone_slab`).

The generator prints a NOTE listing any family whose textures are *all* missing,
since that usually means a deleted block rather than a real gap. Check those
against the mod source and add the dead ones here.

### Accepting a submission

1. Download the PNG from the issue.
2. Drop it into the mod repo at `src/main/resources/assets/motherlode/textures/<id>.png`.
3. Add the contributor to `CREDITS.md`.
4. Add the id to `done` in `status.json` here.
5. Rerun the generator, commit both repos, close the issue.

### Hosting

GitHub Pages, serving from the repository root of the `main` branch
(Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`).
