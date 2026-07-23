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
`index.html`, `app.js` or `style.css` — regenerate instead, from the mod repo:

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
| `placeholder` | The PNG is byte-identical to 2+ others, or is a flat fill of ≤2 colours. |
| `unreviewed` | A real-looking PNG exists but you haven't signed it off. |
| `done` | You listed it under `done`. |

Only `done` needs manual work, and only for textures you are happy with.
Anything you list under `placeholder` is forced to that status even if the
heuristics think it looks fine — useful for art that is drawn but wrong.

```json
{
  "done": [
    "block/adamantite_ore",
    "item/amber"
  ],
  "placeholder": [
    "block/cryptstone"
  ],
  "notes": {
    "block/cryptstone": "Drawn, but too saturated next to the rest of the family."
  }
}
```

`notes` shows up on the texture's page, so use it to steer contributors.

### Accepting a submission

1. Download the PNG from the issue.
2. Drop it into the mod repo at `src/main/resources/assets/motherlode/textures/<id>.png`.
3. Add the contributor to `CREDITS.md`.
4. Add the id to `done` in `status.json` here.
5. Rerun the generator, commit both repos, close the issue.

### Hosting

GitHub Pages, serving from the repository root of the `main` branch
(Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`).
