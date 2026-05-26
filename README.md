# Icon & Preview Tool

A browser-based creator tool for TikTok Effect icon and preview asset production.

## What is included

- ICON mode with Before / After, Video Sequence, and Single Scene templates.
- PREVIEW mode with Sequence Preview, Slide Before/After, and Side-by-Side templates.
- Image/video upload, drag repositioning, wheel/slider scaling, timeline playback, speed and curve controls.
- Real-time canvas rendering mapped into a TikTok-style mockup.
- PNG/JPG export for the final asset and mockup.
- Custom template creation for local reuse during the current session.

For the best preview experience, double-click `start-icon-preview.command`, then open:

`http://127.0.0.1:5173/`

To make the tool open reliably after every restart, double-click `install-autostart.command` once. It adds a macOS login item that starts the local preview service automatically from a runtime copy in `~/Library/Application Support/TF Icon Preview Tool`.

To remove the login item later, double-click `uninstall-autostart.command`.

After editing the source files, run `install-autostart.command` again to refresh the runtime copy.

You can also open `index.html` directly in a browser when you only need a quick static preview.
