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

## Put it online

```bash
npm install
npm run build
ADMIN_PASSWORD=choose-a-password npm start
```

Settings (see `.env.example`):

- `ADMIN_PASSWORD`: required to edit from anywhere.
- `PORT`: most hosts set this for you.
- `DATA_DIR`: where `invite.json` (content) and `access.json` (lock, guest password, share codes) are saved.
  It must be on a **persistent disk or volume**, otherwise edits are lost when the host restarts.

Hosts that work well: Railway (add a volume and set `DATA_DIR` to it), Render (with a disk), Fly.io (with a volume), or any VPS.

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
