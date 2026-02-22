# EAS (Expo Application Services) Deployment Guide

This guide explains how to build and deploy the Veto app using EAS cloud builds,
which completely bypasses local Xcode/environment issues.

## Why EAS?

The previous development sessions encountered persistent local environment blockers:
- macOS `EPERM` permission errors in Metro Bundler
- Wi-Fi AP isolation preventing device connections
- Tunnel (`ngrok`, `localtunnel`) failures

EAS builds run entirely on Expo's cloud servers. You only need:
1. An Expo account (free at https://expo.dev)
2. An Apple Developer account ($99/year, required for iOS device builds)
3. The EAS CLI installed locally

---

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Log In to Expo

```bash
eas login
```

## Step 3: Link the Project to Your Expo Account

```bash
cd /path/to/veto
eas build:configure
```

This will:
- Create a project on expo.dev
- Update `app.json` with the real `projectId`
- Update `eas.json` if needed

## Step 4: Trigger a Development Build (for device testing)

A development build installs a custom Expo dev client on your iPhone.
This is the recommended path for testing Phase 2 features.

```bash
eas build --platform ios --profile development
```

- EAS will ask for your Apple Developer credentials
- It will create provisioning profiles automatically
- Build takes ~10-15 minutes on EAS servers
- You'll get a download link to install the `.ipa` directly on your device

## Step 5: Install on Device

After the build completes:
1. Open the EAS build link on your iPhone
2. Install the app (you may need to trust the developer certificate in Settings)
3. Open the app — it will connect to the Metro bundler on your Mac

Or use the Expo Orbit app (https://expo.dev/orbit) to install builds directly.

## Step 6: Preview Build (for internal testing without Metro)

A preview build is a standalone app that doesn't need a running Metro server.

```bash
eas build --platform ios --profile preview
```

Share the build link with testers via TestFlight or direct install.

## Step 7: Production Build (for App Store)

```bash
eas build --platform ios --profile production
```

Then submit to App Store Connect:

```bash
eas submit --platform ios
```

Fill in your Apple credentials in `eas.json` under `submit.production.ios`:
- `appleId`: Your Apple ID email
- `ascAppId`: App Store Connect App ID (found in App Store Connect)
- `appleTeamId`: Your Apple Developer Team ID

---

## Important: Add VetoMetricsModule to Xcode

The new `VetoMetricsModule.swift` and `VetoMetricsModule.m` files have been added
to `ios/Veto/`. Before building, you must add them to the Xcode project:

1. Open `ios/Veto.xcworkspace` in Xcode
2. Right-click on the `Veto` group in the Project Navigator
3. Select "Add Files to Veto..."
4. Add both `VetoMetricsModule.swift` and `VetoMetricsModule.m`
5. Ensure "Add to target: Veto" is checked

EAS will pick these up automatically once they are in the Xcode project file.

---

## Troubleshooting

**"No bundle identifier found"**
→ Check `app.json` has `ios.bundleIdentifier: "com.kacicalvaresi.veto"`

**"Provisioning profile not found"**
→ Run `eas credentials` to manage certificates and profiles

**"Build failed: EPERM"**
→ This is a local issue only. EAS builds are not affected by local permissions.

**"Module VetoMetricsModule not found"**
→ The Swift/ObjC bridge files need to be added to Xcode (see above)

---

## Current Build Profiles

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Device testing with Metro | Internal (direct install) |
| `preview` | Standalone testing | Internal (direct install) |
| `production` | App Store submission | App Store |
