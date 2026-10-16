# Site

The landing page, the "iOS with JIT" page at `/ios-jit`, the privacy policy and the account deletion page, served at `pkhemu.openpkx.fyi`. Plain HTML with no build step, deployed to wawesome as the `root` function of the `pkhemu` app. Run `npx wawesome deploy` from this folder. It serves the files in `public/`.

The Google consent screen and the Dropbox app link to `/` as the homepage and `/privacy` as the privacy policy. The sideload build's update notice opens `/ios-jit`. Change the policy's date when its content changes.

Browsers cache `style.css` for 4 hours while the pages aren't cached, so bump the `?v=` on every page's stylesheet link whenever `style.css` changes.

Every page has the Ko-fi bar at the bottom. On the landing page it starts hidden, and a script shows it only while the `#coffee` section is off screen. Without JavaScript it stays hidden there.

Fonts are self-hosted so the pages make no third-party requests. Both are under the SIL Open Font License, included next to them.
