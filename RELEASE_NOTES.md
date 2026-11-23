Lantas 1.0.3

- **One mark, everywhere.** The small L-and-cloud glyph replaces the old mountain artwork in the title bar, sidebar, chat, Code workspace, Settings and About screen. The app icon, favicon and DMG background are rebuilt from the same mark.
- **A workbench with its own character.** Code mode now uses Lantas Studio: a warm ink-and-sage surface that fits a laptop window, with a calmer activity rail, editor chrome, welcome screen and terminal. It is still Monaco underneath, and **Open in VS Code** is in the top bar, File menu and Settings.
- **A terminal that actually works.** The bottom panel starts a persistent `zsh` session, shows live output, and keeps a separate CLI tab. The bundled `lantas` CLI now starts on macOS, including Homebrew, Volta and local Node installs, and says exactly what is missing when Node is unavailable.
- **The model can use the terminal.** A new `terminal` tool runs commands with a real exit status and stdout/stderr, renders shell output in the chat transcript, and respects the same permission rules as the other tools.
- **Browser actions are verified, not assumed.** Every click, type, key press and navigation now reads back the actual page. Snapshots include numbered control references, labels, canvas controls and graph state; clicking dispatches a full pointer sequence; typing falls back to the app's own API when a rich editor ignores synthetic input.
- **Desmos works end to end.** "Open Desmos and graph y=2x+4" now selects the expression row, types the equation, verifies it through `Calc.getExpressions()`, and reports the confirmed expression.
- **See the browser working from chat.** A mini browser window sits above the composer while the agent is driving a page, with the live URL and the verified step trail. **Open browser** moves the same page into the Browser tab.
- **Editor settings in the open.** Font size, font family, tab size, word wrap and minimap are now exposed in Settings → Appearance, alongside the existing IDE controls.
- **A side panel that feels part of the app.** The Chrome extension has a new Lantas header, live page card, calmer prompt cards, a proper empty state and a warmer composer. It still reads and acts only in the tab you are on.
- **The drag-to-Applications window stays.** The DMG still opens on the cream Lantas window with the app beside the Applications folder, so installing is one drag.

This build is ad-hoc signed. macOS asks you to approve Lantas once: open **System Settings → Privacy & Security**, click **Open Anyway**, and authenticate. After that it opens normally. The installer clears the flag for you if you prefer not to click through.
