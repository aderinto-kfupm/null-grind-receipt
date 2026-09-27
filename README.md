# The Time Receipt: standalone deploy

Everything this app needs is in this folder. Deploy the folder as the site root (Netlify drop,
Cloudflare Pages, GitHub Pages, Vercel: no build step).

| File | What it is |
|---|---|
| `index.html` | The app (one screen at a time: intro → role → tasks → receipt → kills → done) |
| `receipt.js` | The app logic, task catalogue and kill plans |
| `config.js` | **The only file to edit:** handle, `siteUrl`, `vaultUrl`, email capture |
| `vault.js` | Shared Vault helpers (email gate, UTM tags, copy, toasts): a copy of `vault/assets/vault.js` |
| `vault.css` | Shared Vault styles: a copy of `vault/assets/vault.css` |
| `me.jpg` | Avatar (top bar): a copy of `vault/assets/me.jpg` |
| `favicon.png`, `apple-touch-icon.png` | Tab and home-screen icons: copies from `vault/assets/` |

The only outside request is Google Fonts (Montserrat).

## Before you deploy (`config.js`)

- `siteUrl`: this app's address, e.g. `receipt.yourdomain.com`. It's printed on the share card and
  in the share caption.
- `vaultUrl`: the System Vault's address, if it's live. It turns on the "More free systems",
  Leverage Audit and Citation Checker links. Leave it empty and those links hide themselves.
- `email`: leave `provider: 'none'` to launch with every kill open; set up Kit later (`kitForms.receipt`).

## Keeping the copies in sync

`vault.js`, `vault.css` and the images are copies, so a change to the Vault's shared files doesn't
reach this app on its own. After editing `vault/assets/`, copy the changed file here too.
