# Questlog

A responsive D&D session blog/social frontend designed for GitHub Pages.

## The four project files

- `index.html`
- `styles.css`
- `script.js`
- `README.md`

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload all four files to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.

No Supabase, Firebase, API key, or separate backend account is required.

## Working features

- Mix-and-match avatar builder with hair, eyes, mouth, accessories, skin, hair, eye, and background colours
- Real hash-based screens for Home, Campaigns, Lore, Discover, Saved, Notifications, and Profile
- Campaign creation, editing, scheduling, and campaign-linked posts
- Post editor with genuinely different forms and layouts for session recaps, dice rolls, characters, dialogue, and lore
- Four working blog styles that alter published cards and live previews
- Character sheet and character-avatar creation
- Configurable die type, roll result, modifier, and check name
- Comments, reactions, bookmarks, native sharing/clipboard sharing, post menus, editing, deleting, copying, and local reporting
- Following and friend controls for discovered users
- Search, mobile navigation, empty states, hover motion, and responsive layouts
- No seeded posts, profiles, campaigns, notifications, or fake social numbers
- Posts are removed from the app after 48 hours

## Shared posts without an owner backend account

Questlog attempts to sync profiles and posts through public Nostr relays. The browser creates a cryptographic key automatically; the site owner does not need to register for a backend service. If relays are unavailable, the app continues in local mode using browser storage.

Public relays are independent services. Questlog filters posts after 48 hours and publishes an expiration tag, but cannot guarantee how an external relay physically retains data.
