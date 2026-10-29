# Priyansh & Ayushi · Wedding invitation

React (Vite) site plus a small Node/Express server, which also runs the editing portal.

| URL | What |
| --- | --- |
| `/` | The main link. It shows the events chosen in the portal ("The main link shows"). |
| `/i/<code>` | A share link: wedding only, reception only, or both. Copy these from the portal. |
| `/admin` | The portal: every detail, the wedding and reception, the password lock, share links. Changes go live when you save. |
| `/api/invite` | `GET`: what a guest may see (add `?link=<code>`; send `X-View-Password` while locked). `PUT`: save the content (admin). |
| `/?static=1&page=reception-venue` | Preview one page without the opening animation (`top`, `save-the-date`, `wedding`, `wedding-venue`, `reception`, `reception-venue`, `rsvp`). |

## Privacy

- **Password lock** (portal → Privacy & sharing): while it's on, the server sends no details at all until the guest enters the password. Each device asks once.
  While locked, link previews are generic and `preview.jpg` is hidden. The page's code contains no names, dates or venues.
- **Share links**: each code only ever returns its own events, so a reception-only guest can't change the link to see the wedding.
  "Make new links" replaces all codes; the old ones stop working.
- **Hiding an event** removes it from every link.

## Run on your computer

```bash
npm install
npm run dev          # http://localhost:3000 and http://localhost:3000/admin
```

Without `ADMIN_PASSWORD` the portal only accepts edits from the same computer.

## Put it online: Vercel

`vercel.json` sets everything up. Vercel serves the built site from `dist/`, and `api/index.js` runs the server for `/`, `/i/<code>`, `/admin`, `/og/*` and `/api/*`.
Vercel can't keep files, so the saved content goes to an **Upstash Redis** database.

1. Vercel → this project → **Storage** → **Upstash for Redis** (free) → create it (region Mumbai if offered) → **Connect** it to this project.
   This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
2. Vercel → **Settings → Environment Variables**:
   - `ADMIN_PASSWORD`: your portal password (required to edit).
   - `GUEST_PASSWORD` (optional): the site starts locked with this guest password until you change it in the portal.
3. Push to GitHub (or **Redeploy**). Then open `/admin` on your domain and copy the share links from there.

Your computer's `data/` folder isn't uploaded, so the live site starts from `server/defaults.js` and keeps its own saved content in Redis.

## Put it online: any Node host

```bash
npm install
npm run build
ADMIN_PASSWORD=choose-a-password npm start
```

`DATA_DIR` sets where `invite.json` (content) and `access.json` (lock, guest password, share codes) are saved.
It must be on a **persistent disk or volume** (Railway volume, Render disk, a VPS).

Anything missing from the saved content falls back to `server/defaults.js`.

## Media

`public/assets/`:

- `ganesha.mp4`: the opening, Shri Ganeshaya Namah. It plays by itself, then fades into page one. `ganesha-poster.jpg` and `ganesha-still.jpg` are its stills.
- `intro.mp4`: page one's first play, 10 s, with the birds.
- `loop.mp4`: the bird-free 3 s loop.
- `couple-cover.webp`: hides the swing after page one.
- `invi-music.mp3`: background music.
- `preview.jpg`: the WhatsApp link preview (with the wedding date).
- `preview-ganesha.jpg`: the preview for reception-only links.
