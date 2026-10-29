# Waydrop Android Deployment Guide

This guide covers building and releasing the Waydrop Android app to Google Play. It assumes the Laravel backend is already deployed.

## 1. Prepare the release configuration

The Android application ID is `app.waydrop`. Treat it as permanent: Google Play does not allow it to change after the first release.

Set a public release version in `app.json` and add an Android version code inside the existing `android` object:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "package": "app.waydrop",
      "versionCode": 1
    }
  }
}
```

Increase `android.versionCode` for every Google Play release. For example, the next release uses `2`, then `3`, and so on.

## 2. Configure the production backend URL

The mobile app reads its API endpoint from `EXPO_PUBLIC_API_BASE_URL`. Set it to the HTTPS URL of the production backend; do not use `localhost`, a local-network IP address, or a development server.

Create the EAS production environment variable from the `waydrop` directory:

```powershell
npx eas-cli@latest env:set `
  --name EXPO_PUBLIC_API_BASE_URL `
  --value "https://api.your-domain.com" `
  --environment production `
  --visibility plaintext
```

`EXPO_PUBLIC_` values are compiled into the app and can be read by users. Never put API secrets, payment secrets, Agora server credentials, or private keys in them.

## 3. Test a native build before release

Agora calls cannot run in Expo Go. Install and test a native Android build on a physical device instead:

```powershell
npm run android
```

Before proceeding, test the production backend flow on a physical device:

- Sign-up, sign-in, sign-out, and account deletion.
- Creating, accepting, and completing errands.
- Location, camera/photo upload, notifications, and payments.
- Agora calls in the installed native build.
- Expected errors when the backend is unavailable.

If `npm run android` cannot find the phone, enable Developer options and USB debugging, choose File Transfer for the USB connection, accept the phone's debugging prompt, and verify that `adb devices -l` lists the device. Windows also needs Android SDK Platform-Tools installed and available on `PATH`.

## 4. Configure EAS Build

Create an Expo account if needed, then configure the project:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

This creates `eas.json` if it is not already present. Use the following build profiles as a baseline:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "environment": "preview"
    },
    "production": {
      "environment": "production"
    }
  }
}
```

The `preview` profile creates an APK for testers to install directly. The `production` profile creates an Android App Bundle (`.aab`) for Google Play.

## 5. Set up Google Play Console

Create a Google Play Developer account, then create a new app in Play Console with the package name `app.waydrop`.

Prepare the store listing:

- App name, short description, and full description.
- App icon, phone screenshots, feature graphic, support email, and website.
- A public HTTPS privacy-policy page that is also accessible from inside the app.
- Accurate App content declarations: target audience, content rating, ads, and reviewer access details.
- Accurate Data Safety declarations for all data collected or handled by Waydrop and its SDKs.

Waydrop uses location, camera/photos, microphone/calls, notifications, account data, and potentially payment information. The privacy policy and Data Safety form must correctly describe how these are collected, used, retained, and shared. Ensure users can request account deletion.

## 6. Build the production Android App Bundle

Run the local preflight checks:

```powershell
npm run typecheck
npx expo-doctor
```

Then create the production build:

```powershell
npx eas-cli@latest build --platform android --profile production
```

On the first build, EAS can generate and manage the Android signing keystore. Keep the Expo project and its signing credentials secure; all future updates must be signed with the same key.

Download the resulting `.aab` when the build succeeds. New Google Play submissions must target Android API level 36 or higher as of August 31, 2026.

## 7. Publish to internal testing

In Play Console:

1. Open **Testing > Internal testing**.
2. Create a release and upload the `.aab` file.
3. Add internal testers and share the opt-in link.
4. Install the Play-distributed app and test the full production flow again.

You can automate later uploads with EAS Submit after creating a Google service account key and adding it to the EAS project. For a first release, uploading the downloaded `.aab` manually is the simplest approach.

## 8. Complete closed testing when required

Personal Google Play developer accounts created after November 13, 2023 must usually run a closed test with at least 12 testers continuously opted in for 14 days before they can request production access.

Use the closed-test period to collect feedback and fix issues. Each updated Play upload must have a higher `android.versionCode`.

## 9. Release to production

After Google grants production access:

1. Create a release under **Production** in Play Console.
2. Upload the latest `.aab`.
3. Resolve every Play Console warning and complete all declarations.
4. Send the release for review.
5. Use a staged rollout first if desired, then expand to all users.

## 10. Future updates

For every new Google Play build, increase `android.versionCode`.

JavaScript-only changes may be delivered with EAS Update after it is configured. Changes to native packages, native permissions, app configuration, icons, or the Agora integration require a new Android build and a new Google Play release.

## Official references

- [Expo EAS Build setup](https://docs.expo.dev/build/setup/)
- [Expo EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [Expo submission to Google Play](https://docs.expo.dev/submit/android/)
- [Google Play app review preparation](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Google Play Data Safety requirements](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play closed-testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
