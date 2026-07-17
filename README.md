# Questlog — GitHub Pages build

A responsive D&D session-blog social frontend that can be hosted as a static GitHub Pages site.

## No backend account required

Questlog uses the open Nostr protocol and public WebSocket relays. The site owner does not need Supabase, Firebase, a server, an API key, or any other backend account.

Users can:
- create an in-app account with a display name and avatar;
- receive a private recovery key for signing in on another device;
- publish full blog/session posts from the frontend;
- optionally attach an HTTPS image URL;
- see posts published by other devices;
- search and react to posts.

Posts include a 48-hour expiration request and the frontend never displays posts older than 48 hours. Public relays are independent services, so the app cannot guarantee when every relay physically erases its stored copy, but expired posts are removed from the Questlog experience.

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload every file in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.

No build command or configuration is required.

## Important

The app imports `nostr-tools` from `esm.sh` and loads avatars/fonts from external CDNs, so visitors need internet access. Public relays can be intermittently unavailable; three relays are used for redundancy.
