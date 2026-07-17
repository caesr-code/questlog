# Questlog — P2P GitHub Pages build

Upload these four files to the root of a GitHub repository and enable **Settings → Pages → Deploy from a branch**.

## How sharing works

- Questlog joins one automatic global peer-to-peer lobby using WebRTC.
- Every new post receives an eight-character share code.
- New and edited posts are broadcast automatically to every Questlog user currently connected.
- When someone opens Questlog, their browser asks connected peers for the current 48-hour feed.
- Share creates a direct URL containing the post code. Opening it requests that exact post from connected peers.
- Profiles, comments, and reactions are also shared peer-to-peer.
- No Supabase, Firebase, API key, database account, or custom server is required.

## Important P2P limitation

Pure peer-to-peer storage only exists in users’ browsers. If every user who has a post closes Questlog, there is no always-on server holding it. The post can reappear when one of those users returns within 48 hours, but a brand-new visitor cannot retrieve it while no peer with a copy is online.

## Files

- `index.html`
- `styles.css`
- `script.js`
- `README.md`
