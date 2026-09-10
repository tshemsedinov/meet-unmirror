# Google Meet Self-View Unmirror

A small Chrome/Chromium extension that automatically applies a second horizontal flip to the Google Meet video tile belonging to a selected participant. This cancels Meet's mirrored local self-view.

Default participant: `Timur Shemsedinov`

## Install on Chrome / Fedora

1. Extract this folder somewhere you will keep permanently
2. Open Chrome and go to: `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the extracted `meet-unmirror` folder
6. Open or reload Google Meet

## Configure

Click the extension icon in Chrome.

- Enable/disable automatic unmirroring.
- Enter the participant name exactly as Google Meet displays it.
- Click **Save**.

If you change the setting while a Meet tab is open, the extension updates the page automatically.

## Notes

- The change is local to your browser display.
- It does not intentionally alter the outgoing camera stream.
- Google Meet's internal DOM is not a public/stable API. If Google changes its page structure, the matching logic may need an update.
- The extension watches Meet DOM changes so it can reapply the fix when Meet rebuilds participant tiles after layout changes, pinning, resizing, etc.

## Files

- `manifest.json`: Chrome extension manifest
- `shared.js`: default settings, name normalization, settings parsing
- `content.js`: finds the named participant tile and applies the local flip
- `popup.html, popup.js`: settings UI
