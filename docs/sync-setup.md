# Setting up sync

pkh-emu syncs games to the player's own Google Drive or Dropbox. Each cloud needs an OAuth client registered under our account. The client IDs stay out of the repository: builds read them from the environment, or from `app/src-tauri/sync.env` on your machine. A build without them hides sync. A build with only one cloud's IDs offers only that cloud.

## Google Drive

You need a Google account that will own the project, and admin access to `pkhex-web/pkh-emu` on GitHub.

### 1. Create the project

1. Open <https://console.cloud.google.com/projectcreate>.
2. Name the project `pkh-emu` and create it. Select it in the project picker at the top for the steps below.
3. Open <https://console.cloud.google.com/apis/library/drive.googleapis.com> and click **Enable**.

### 2. Set up the consent screen

Open <https://console.cloud.google.com/auth/overview> and click **Get started**.

1. Under **App information**, enter the app name `pkhemu` and pick your email as the support email. Never use "Pokémon" or "Pokemon" in the name, the logo or any other field.
2. Under **Audience**, pick External.
3. Under **Contact information**, enter your email.
4. Accept the policy and click **Create**.

Then:

1. In **Branding**, set the home page to `https://pkhemu.openpkx.fyi` and the privacy policy link to `https://pkhemu.openpkx.fyi/privacy`, and add `openpkx.fyi` as an authorized domain. The domain has to be verified in Search Console first. Leave the logo empty until the app's icon is final, since a logo needs verification again.
2. Open **Data access** and click **Add or remove scopes**. Add these three, then click **Update** and **Save**:
   - `https://www.googleapis.com/auth/drive.appdata`
   - `openid`
   - `.../auth/userinfo.email`

   All three are non-sensitive, so Google doesn't review the app.
3. Open **Audience**, click **Publish app**, then **Confirm**. Google enables the button only once Branding has the home page, privacy policy and authorized domain. The status should read "In production". In testing mode only 100 listed test users can sign in, and their sign-in expires after 7 days.
4. Open the **Verification Center** and submit brand verification. It takes 2 to 3 business days. Until it passes, the consent screen shows the domain instead of "pkhemu".

### 3. Create the desktop client

1. Open <https://console.cloud.google.com/auth/clients> and click **Create client**.
2. Application type **Desktop app**, name `pkh-emu desktop`. Click **Create**.
3. Copy the client ID and the client secret. Google treats a desktop client's secret as public, so it may ship in the app.
4. Put both in `app/src-tauri/sync.env` (gitignored; the first build creates it):

   ```
   PKH_EMU_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   PKH_EMU_GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

5. Add both as GitHub secrets, so the Build workflow uses them:

   ```sh
   gh secret set PKH_EMU_GOOGLE_CLIENT_ID -R pkhex-web/pkh-emu
   gh secret set PKH_EMU_GOOGLE_CLIENT_SECRET -R pkhex-web/pkh-emu
   ```

   Each command asks for the value.

### 4. Create the Android clients

Android sign-in needs no client ID in the app. Google matches the app by its package name and the SHA-1 of the certificate that signed it, so each signing key needs its own Android client.

The package name is `fyi.openpkx.pkhemu`, the same as the app's identifier.

Get the SHA-1 of the debug keystore, which signs local builds:

```sh
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA1
```

Get the SHA-1 of the release keystore, which CI signs with. The `ANDROID_KEYSTORE_BASE64` secret holds it base64-encoded, and GitHub can't show a secret again, so start from the keystore file you encoded. If you only have the base64 text, decode it first:

```sh
base64 -d < release.keystore.base64 > release.keystore
keytool -list -v -keystore release.keystore | grep SHA1
```

`keytool` asks for the keystore password (`ANDROID_KEYSTORE_PASSWORD`). Without the keystore, download the APK from a Build run of the workflow and read its certificate:

```sh
"$(ls -d "$ANDROID_HOME"/build-tools/* | tail -1)"/apksigner verify --print-certs pkhemu.apk | grep SHA-1
```

For each SHA-1:

1. Open <https://console.cloud.google.com/auth/clients> and click **Create client**.
2. Application type **Android**. Name it `pkh-emu Android debug` or `pkh-emu Android release`.
3. Package name `fyi.openpkx.pkhemu`, and the SHA-1 with its colons.
4. Click **Create**. There's nothing to copy.

If the app ships through Google Play with Play App Signing, add a third client with the SHA-1 that Play Console shows under **Test and release**, then **App integrity**.

### 5. Check it

Once the Sync section in Settings exists (#215):

1. Build the app on a Mac with `sync.env` filled in, open Settings, and connect Google Drive. The browser should show the consent screen named pkhemu.
2. Run the Build workflow for Android with the secrets set, install the APK, and connect there.
3. Play a game on one device, quit it, and open it on the other.

## Dropbox

You need a Dropbox account that will own the app, and admin access to `pkhex-web/pkh-emu` on GitHub.

### 1. Create the app

1. Open <https://www.dropbox.com/developers/apps/create>.
2. Pick **Scoped access**, then **App folder**.
3. Name the app `pkhemu` and click **Create app**. Dropbox keeps the app's files in `Apps/pkhemu` in the player's Dropbox. Never use "Pokémon" or "Pokemon" in the name, the icon or the description.

### 2. Pick the scopes

Open the app's **Permissions** tab, tick these five, and click **Submit**:

- `account_info.read`
- `files.metadata.read`
- `files.metadata.write`
- `files.content.read`
- `files.content.write`

### 3. Register the redirect URIs

Open the **Settings** tab. Under **OAuth 2**, check that **Allow public clients (Implicit Grant & PKCE)** says Allow. pkh-emu signs in with PKCE and ships no app secret.

Under **Redirect URIs**, add each of these exactly, one at a time:

```
http://localhost:18734
http://localhost:18735
http://localhost:18736
fyi.openpkx.pkhemu://dropbox
```

Dropbox only takes a redirect that matches one registered here, port included. The desktop app listens on the first of the three ports that's free, so another app holding one doesn't stop sign-in. Android's Custom Tab returns to the app through the last URI, which an intent filter in `AndroidManifest.xml` handles.

### 4. Add the app key

1. Copy the **App key** from the Settings tab. pkh-emu doesn't use the app secret.
2. Put it in `app/src-tauri/sync.env`:

   ```
   PKH_EMU_DROPBOX_APP_KEY=abc123xyz
   ```

3. Add it as a GitHub secret:

   ```sh
   gh secret set PKH_EMU_DROPBOX_APP_KEY -R pkhex-web/pkh-emu
   ```

A build with the key offers "Connect Dropbox" in the Sync section.

### 5. Go to production

A new Dropbox app is in development, and only 500 accounts can link to it. Before the public release, click **Apply for production** on the Settings tab.

### 6. Check it

1. Build the app on a Mac with the key in `sync.env`, open Settings, and connect Dropbox. The browser should ask you to allow pkhemu.
2. Run the Build workflow for Android with the secret set, install the APK, and connect there.
3. Play a game on one device, quit it, and open it on the other. Its files show up in `Apps/pkhemu`.

## Google Play

The Android app keeps syncing after the player leaves it through a foreground service of type `dataSync`. Before publishing on Google Play, declare it in the Play Console under **App content**, then **Foreground service permissions**. Pick **Data sync** and give the reason "uploading the player's saves to their own cloud". Play blocks the release until it is declared.

## Store builds

A store build sells sync and the Lab as Plus. Every other build is a build from source and has Plus unlocked. Two keys make a store build. Builds read them like the cloud keys, from the environment or `sync.env`.

- `PKH_EMU_STORE`: `play` for Google Play. `appstore` has no store behind it until StoreKit lands, so Plus reports unavailable there. Empty, the default, builds an unlocked app.
- `PKH_EMU_PLUS`: `on` sells Plus, and sync and the Lab work only while the player owns it. Empty, the default, hides both until Plus launches.

A player who loses Plus, through a refund for example, stops syncing and loses the Lab. Their files stay on the device and in the cloud, and the app keeps the sign-in, so buying Plus again resumes sync and brings the Lab back.

To build for Google Play, run the Build workflow with **store** ticked. It sets `PKH_EMU_STORE=play`, takes `PKH_EMU_PLUS` from a repository variable, and uploads `pkhemu-android-play` with an APK and an App Bundle. Upload the bundle, `pkhemu.aab`, to Play. It's signed with the `ANDROID_KEYSTORE_BASE64` keystore, Play's upload key under Play App Signing. Turn Plus on when it launches:

```sh
gh variable set PKH_EMU_PLUS -R pkhex-web/pkh-emu --body on
```
