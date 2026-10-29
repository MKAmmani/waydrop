TASK: Set up an EAS internal-distribution Android build (APK) of the Waydrop Expo app, so I get a shareable install link. Work step by step and report briefly at the end.

CONTEXT
- The Expo app is in the `waydrop/` folder of this repo (contains app.json, package.json, android/). The Laravel backend in `backend/` is already deployed and must NOT be touched.
- Production API base URL for the app: https://cunning-hawk-2c1cdc.rumptycloud.app/api/v1
- The app uses native modules (e.g. Agora calls, push notifications), so Expo Go is not enough. We need a real build.
- Target: Android only, APK, "distribution": "internal".

STEPS
1. Inspect, do not change yet: waydrop/app.json (or app.config.js), package.json, any existing eas.json, .env.example, and src/api/baseUrl.ts. Tell me:
   - the Expo SDK version,
   - whether android.package is set,
   - every EXPO_PUBLIC_* variable the app reads (grep the src/ and app/ folders),
   - whether the committed android/ folder means the project is "bare" (EAS then uses android/ and ignores some app.json native settings; mention anything that conflicts).
2. Make sure eas-cli is installed (npm install -g eas-cli, or use npx eas-cli). Check `eas whoami`. If I'm not logged in, STOP and ask me to run `eas login` myself in this terminal. Never ask me to paste passwords or tokens into the chat.
3. Run `eas build:configure` (Android) if eas.json does not exist.
4. Edit eas.json so there is a "preview" build profile with:
   - "distribution": "internal"
   - "android": { "buildType": "apk" }
   - an "env" block containing EXPO_PUBLIC_API_BASE_URL set to the URL above, plus any other EXPO_PUBLIC_* values you found that are public (not secrets). List any you could not fill so I can supply them.
   Keep any existing profiles (development/production) intact.
5. If android.package is missing, set a sensible one (look at android/app/src/main/java/app/waydrop/MainActivity.kt; it is probably "app.waydrop") and tell me.
6. Run `npx expo-doctor` and fix or report any problems that would break the build. Do not upgrade the Expo SDK or major dependencies without asking me.
7. Start the build: `eas build --platform android --profile preview`. If it asks to generate a keystore, answer yes (let EAS manage credentials). Wait for it to finish, or give me the build URL if it keeps running.
8. If the build fails, read the logs, fix what is in my code or config, and retry once. If it still fails, show me the exact error.

RULES
- Do not commit, push, or print secrets (API keys, tokens, keystores, .env contents). Never put server secrets (TERMII, ABLY, SQUAD, ZAINPAY, SMILE_ID, PREMBLY, AGORA certificate, etc.) in eas.json or the app. Only public EXPO_PUBLIC_* values go there.
- Do not modify the backend/ folder.
- Do not run `git commit` or `git push` unless I ask.
- Ask me before any destructive or paid action.

FINAL REPORT (keep it short)
- The build page URL / install link
- Files you changed
- Anything I still need to do (missing env values, credentials, etc.)