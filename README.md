# Air Traffic

Automatic URL routing for [Firefox](https://www.mozilla.org/firefox/) containers. Define URL patterns, assign them to containers, and tabs open in the right place automatically.

Works with any Firefox-based browser. On [Zen Browser](https://zen-browser.app/), it pairs perfectly with workspaces — pair a container with a workspace and get automatic workspace switching for free.

**The problem:** You use multiple containers (work, personal, client projects) and constantly reopen tabs in the wrong context.

**The solution:** Air Traffic intercepts navigation, matches URLs against your rules, and reopens tabs in the correct container. Automatically.

```
github.com      -> Dev container
slack.com       -> Work container
buser.com.br    -> Buser container
gmail.com       -> Personal container
```

## How it works

### Firefox

1. You create rules mapping URL patterns to containers
2. When you navigate to a matching URL, Air Traffic reopens the tab in the correct container
3. Cookies, sessions, and logins stay isolated per container

```
URL matched -> Reopen in correct container
```

### Zen Browser (bonus: workspace switching)

Zen Browser supports pairing containers with workspaces. When combined with Air Traffic:

1. You create rules mapping URL patterns to containers
2. Each container is paired with a Zen workspace (Zen's native feature)
3. Air Traffic reopens the tab in the correct container
4. Zen automatically switches to the paired workspace

```
URL matched -> Reopen in container -> Zen switches workspace
```

This makes Air Traffic a full workspace router on Zen, without needing any Zen-specific API.

## Pattern types

| Type | Example | Matches |
|------|---------|---------|
| **Domain** | `github.com` | `github.com`, `api.github.com`, `www.github.com` |
| **Domain contains** | `google` | `mail.google.com`, `docs.google.com`, `google.com.br` |
| **URL contains** | `buser` | Any URL containing "buser" |
| **Regex** | `^https://(www\.)?github\.com` | Full regex for power users |

All matching is case-insensitive. Domain matching is strict (won't match `fakegithub.com`).

## Installation

### From file

1. [Download the latest release](https://github.com/avelino/firefox-airtraffic/releases)
2. Go to `about:addons`
3. Click the gear icon > **Install Add-on From File...**
4. Select the `.zip` file

> If you get a signature error, set `xpinstall.signatures.required` to `false` in `about:config`.

### Build from source

```bash
git clone https://github.com/avelino/firefox-airtraffic.git
cd firefox-airtraffic
npx web-ext build
# Output: web-ext-artifacts/zen_air_traffic-1.0.0.zip
```

## Setup

### Create routing rules

Click the Air Traffic icon in the toolbar:

1. Select the match type (Domain is recommended for most cases)
2. Enter the pattern
3. Pick the target container
4. Click **Add Rule**

Rules can be edited or deleted at any time. That's it for Firefox.

### Zen Browser: enable workspace switching (optional)

To get automatic workspace switching on Zen, two extra steps:

**1. Pair containers with workspaces**

Right-click a workspace > **Edit** > assign a container (e.g., workspace "Work" -> container "Work").

**2. Enable auto-switching**

**Settings > Tab Management > Workspaces > "Switch to workspace where container is set as default when opening container tabs"**

Without this, tabs will open in the correct container but Zen won't auto-switch workspaces.

## Project structure

```
firefox-airtraffic/
├── manifest.json              # Extension manifest (Manifest V2)
├── src/
│   ├── pattern-matcher.js     # URL matching logic (pure, no browser deps)
│   ├── background.js          # Tab interception and container routing
│   └── popup/
│       ├── popup.html         # Rule management UI
│       ├── popup.css
│       └── popup.js           # CRUD for routing rules
├── icons/
│   ├── icon-48.png
│   └── icon-96.png
└── tests/
    └── pattern-matcher.test.js
```

## Development

```bash
# Run tests
node --test tests/pattern-matcher.test.js

# Lint
npx web-ext lint

# Build
npx web-ext build --overwrite-dest

# Run in a fresh Zen instance
npx web-ext run --firefox=/Applications/Zen.app/Contents/MacOS/zen
```

## Compatibility

| Browser | Container routing | Workspace switching |
|---------|------------------|---------------------|
| Firefox | Yes | N/A |
| Zen Browser | Yes | Yes (via container-workspace pairing) |
| Other Firefox forks | Yes (if `contextualIdentities` API is supported) | Depends on fork |

## Technical details

- **Manifest V2** — Firefox/Zen has better container API support in V2
- **Loop prevention** — `tabsInTransit` Set with 5s timeout prevents infinite reopening
- **Ignored URLs** — `about:`, `moz-extension:`, `chrome:` protocols are skipped
- **Container validation** — checks container exists before creating tabs
- **In-memory cache** — rules are cached and invalidated via `storage.onChanged`

## Permissions

| Permission | Why |
|------------|-----|
| `contextualIdentities` | Read/manage Firefox containers |
| `cookies` | Required by `contextualIdentities` |
| `tabs` | Intercept navigation and create/remove tabs |
| `storage` | Persist routing rules |
| `<all_urls>` | Match URLs across all sites |

## License

MIT
