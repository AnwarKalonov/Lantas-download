# Lantas

**A free macOS agent: chat, code and the browser in one window.**

Lantas runs on your Mac. Ask anything, change a codebase, connect the apps you already
work in, or hand it the tab you have open. No account, no subscription, no trial.

This repository is the **download and website** repository. It contains the built app,
the Chrome extension, and the site at `index.html`. The application source is not
published here.

## Download

The newest build is always on the [releases page](https://github.com/AnwarKalonov/Lantas-download/releases/latest).
Every version ever published, with its notes and downloads, is on the
[versions page](versions.html).

| Build | For | File |
| --- | --- | --- |
| dmg | Apple silicon (M1–M4) | `Lantas-1.0.5-arm64.dmg` |
| zip | Apple silicon (M1–M4) | `Lantas-1.0.5-arm64.app.zip` |
| zip | Chrome 116+ | `chrome-extension.zip` |

Direct links use `releases/latest/download/<file>`, for example:

```
https://github.com/AnwarKalonov/Lantas-download/releases/latest/download/Lantas-1.0.5-arm64.dmg
```

## Install

1. Open the dmg and drag **Lantas.app** to Applications. (Or unzip the `.app.zip` there.)
2. The build is ad-hoc signed, so macOS asks you to approve Lantas once. Open
   **System Settings → Privacy & Security**, click **Open Anyway**, and authenticate.
   After that it opens normally. On macOS 15 and later, right-click → Open no longer
   overrides the block. The installer is available as a fallback and clears quarantine
   after copying:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/AnwarKalonov/Lantas-download/main/install.sh | bash
   ```

   Only run a script you trust.
3. Add a model in **Settings → Providers**: Anthropic, OpenAI, OpenRouter, Groq or
   Google with your own key, or Ollama / LM Studio running on the same Mac.
4. Load the Chrome extension once: `chrome://extensions` → Developer mode →
   **Load unpacked** → `/Applications/Lantas.app/Contents/Resources/chrome-extension`.

## What it does

- **Chat** — threads with the model you pick, attachments, screen sharing, slash
  commands, skills, and a ⌘K palette.
- **Code** — a real workspace with Monaco, tabs, quick open, project search, a file
  tree, a terminal and an assistant dock. Assistant writes are staged as diffs you can
  keep or discard, and your own git is built in.
- **Your apps** — 32 toolkits through Composio (Gmail, Slack, Notion, Linear, Jira,
  Drive, HubSpot and more), Gmail through your own OAuth client, and any MCP server.
- **Browser** — a browser of its own and a Chrome side panel. It reads the page you are
  on, clicks a control by its label, and re-reads the page to verify what happened.
- **Models** — Claude, GPT, Gemini, OpenRouter, Groq, Ollama, LM Studio, or any
  OpenAI-compatible endpoint. Requests go from your Mac to the provider you chose.
- **Modes** — Build writes, Plan drafts, Chat answers.

Requires macOS 11 or newer. Chrome 116 or newer is only needed for the optional
Chrome bridge; the built-in browser works on its own.

![The Lantas Code workspace](https://anwarkalonov.github.io/Lantas-download/assets/img/app-code.webp)

## Free

The app is free to download and use: no account, no seats, no metering, no per-task fee.
A local model on the same Mac costs nothing; a hosted provider bills you directly.

## Support

Open an [issue](https://github.com/AnwarKalonov/Lantas-download/issues).

## Licence

Free to download and use, but not open source. See [LICENSE](LICENSE).
