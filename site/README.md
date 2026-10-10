# Site

The landing page and privacy policy, served at `pkhemu.openpkx.fyi`. Plain HTML with no build step, deployed to wawesome as the `root` function of the `pkhemu` app. Run `npx wawesome deploy` from this folder. It serves the files in `public/`.

The Google consent screen and the Dropbox app link to `/` as the homepage and `/privacy` as the privacy policy. Change the policy's date when its content changes.

Fonts are self-hosted so the pages make no third-party requests. Both are under the SIL Open Font License, included next to them.
