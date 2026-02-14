# Veto - Privacy-First Spam Call Blocker

**Version:** 1.0.0  
**Bundle ID:** com.kacicalvaresi.veto  
**Price:** $2.99 (regular), $1.99 (launch promo - 2 weeks)

## Overview

Veto is a privacy-first spam call blocker for iOS and Android that blocks spam calls without collecting any user data. Unlike competitors like Truecaller and Hiya that harvest contacts and sell data, Veto keeps everything on your device.

### Key Features

- ✅ **Zero Data Collection** - No contact harvesting, no tracking
- ✅ **One-Time Purchase** - $2.99 once vs $60/year subscriptions
- ✅ **On-Device Processing** - All data stays on your phone
- ✅ **Anonymous Reporting** - Help the community without revealing identity
- ✅ **Open Source** - Transparent and auditable

## Project Status

**Build Status:** ✅ **CLEAN BUILD SUCCESSFUL**  
**Overall Completion:** ~40%

This is a fresh React Native build using Expo SDK 49 (bare workflow). All dependency conflicts from previous sessions have been resolved.

### What's Complete

- ✅ React Native project setup
- ✅ All UI components and screens
- ✅ Database service (SQLite)
- ✅ iOS Call Directory Extension
- ✅ Android Call Screening Service
- ✅ Privacy Policy and Terms of Service
- ✅ App Store metadata

### What's Needed

- ⚠️ iOS extensions need to be configured in Xcode (requires Mac)
- 🔴 Native metrics bridge not implemented
- 🔴 Backend not deployed
- 🔴 Privacy policy not hosted
- 🔴 Spam database not implemented

See `BUILD_STATUS_AND_NEXT_STEPS.md` for detailed status and next steps.

## Tech Stack

- **Framework:** React Native 0.72.10
- **SDK:** Expo 49.0.0
- **Navigation:** React Navigation 6
- **Database:** Expo SQLite
- **Backend:** Node.js/Express (not deployed)
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

```bash
# Install dependencies
npm install

# Generate native projects (if needed)
npx expo prebuild --clean

# Run on iOS (requires Mac)
npx expo run:ios

# Run on Android
npx expo run:android
```

### iOS Extension Configuration (Mac Required)

The iOS extensions are copied to the correct locations but need to be added to the Xcode project manually. See `BUILD_STATUS_AND_NEXT_STEPS.md` for detailed instructions.

## Project Structure

```
/
├── App.tsx                    # Main app with React Navigation
├── src/
│   ├── components/           # Reusable UI components
│   ├── screens/              # Screen components
│   ├── services/             # Business logic
│   └── utils/                # Utilities
├── ios/                      # iOS native project
│   ├── CallDirectoryHandler/ # Call blocking extension
│   ├── MessageFilter/        # SMS filtering extension
│   └── Action/               # Action extension
├── android/                  # Android native project
├── backend/                  # Backend proxy server
└── targets/                  # iOS extension source files
```

## Documentation

- `BUILD_STATUS_AND_NEXT_STEPS.md` - Current status and roadmap
- `PRIVACY_POLICY.md` - Privacy policy text
- `TERMS_OF_SERVICE.md` - Terms of service text
- `APP_STORE_METADATA.md` - App Store listing content

## Competitive Advantage

| Feature | Veto | Truecaller | RoboKiller | Hiya |
|---------|------|------------|------------|------|
| Privacy-First | ✅ | ❌ | ❌ | ❌ |
| One-Time Purchase | ✅ | ❌ | ❌ | ❌ |
| No Contact Harvesting | ✅ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ❌ | ❌ |
| Price (1 year) | $2.99 | $36 | $60 | $25 |

**Veto is 95% cheaper than competitors while offering better privacy.**

## License

Proprietary - All rights reserved

## Contact

- **Support:** support@veto.app (to be set up)
- **GitHub:** https://github.com/kacicalvaresi-code/veto

---

**Built with privacy in mind. Your data stays on your device.**
