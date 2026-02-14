# Veto App - Quick Start Guide

**For the next developer picking up this project**

---

## ⚡ TL;DR

This is a **clean, working React Native build** using Expo SDK 49 (bare workflow). All dependency conflicts are resolved. iOS and Android native projects are generated. Ready for Xcode configuration and testing.

---

## 🚀 Getting Started (5 Minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/kacicalvaresi-code/veto.git
cd veto
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Open in Xcode (Mac Only)

```bash
cd ios
pod install  # Install CocoaPods dependencies
cd ..
open ios/Veto.xcworkspace  # Open in Xcode
```

### 4. Configure iOS Extensions in Xcode

**This is the MOST IMPORTANT step. The app won't work without it.**

1. In Xcode, select the project in the left sidebar
2. Add Call Directory Extension:
   - File → New → Target → Call Directory Extension
   - Name: `CallDirectoryHandler`
   - Language: Swift
   - Delete the auto-generated files
   - Add files from `ios/CallDirectoryHandler/` to the target
3. Add Message Filter Extension:
   - File → New → Target → Message Filter Extension
   - Name: `MessageFilter`
   - Language: Swift
   - Delete the auto-generated files
   - Add files from `ios/MessageFilter/` to the target
4. Add Action Extension:
   - File → New → Target → Action Extension
   - Name: `Action`
   - Language: Swift
   - Delete the auto-generated files
   - Add files from `ios/Action/` to the target
5. Configure App Groups for ALL targets (main app + 3 extensions):
   - Select target → Signing & Capabilities → + Capability → App Groups
   - Add: `group.com.kacicalvaresi.veto`
6. Set Bundle Identifiers:
   - Main app: `com.kacicalvaresi.veto`
   - CallDirectoryHandler: `com.kacicalvaresi.veto.CallDirectoryHandler`
   - MessageFilter: `com.kacicalvaresi.veto.MessageFilter`
   - Action: `com.kacicalvaresi.veto.Action`

### 5. Run on iOS

```bash
npx expo run:ios
```

### 6. Run on Android

```bash
npx expo run:android
```

---

## 📁 Project Structure

```
veto/
├── App.tsx                    # Main app entry point
├── src/
│   ├── screens/              # All screen components
│   │   ├── ProtectionDashboard.tsx  # Main dashboard
│   │   ├── HomeScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── BlockedCallsScreen.tsx
│   │   └── StatsScreen.tsx
│   ├── components/           # Reusable UI components
│   ├── services/             # Business logic
│   │   ├── database.ts       # SQLite database
│   │   ├── api.ts            # Backend API calls
│   │   ├── metrics.ts        # Metrics tracking
│   │   └── auditLog.ts       # Audit logging
│   └── utils/                # Utilities
├── ios/                      # iOS native project
│   ├── CallDirectoryHandler/ # Call blocking extension
│   ├── MessageFilter/        # SMS filtering extension
│   └── Action/               # Action extension
├── android/                  # Android native project
└── backend/proxy/            # Backend server (not deployed)
```

---

## ⚠️ Critical Information

### What Works ✅

- ✅ React Native build (clean, zero errors)
- ✅ All UI components and screens
- ✅ Database service (SQLite)
- ✅ Navigation (React Navigation)
- ✅ iOS and Android native projects generated

### What Doesn't Work Yet ❌

- ❌ iOS extensions (need to be added in Xcode)
- ❌ Native metrics bridge (dashboard shows zeros)
- ❌ Backend (not deployed, using mock data)
- ❌ Spam database (not implemented)
- ❌ Privacy policy hosting (links are dead)

### What You MUST Do

1. **Configure iOS extensions in Xcode** (see step 4 above)
2. **Test on physical devices** (call blocking doesn't work in simulators)
3. **Deploy backend** (see `backend/proxy/DEPLOYMENT.md`)
4. **Implement native metrics bridge** (see `BUILD_STATUS_AND_NEXT_STEPS.md`)

---

## 🔧 Common Issues & Solutions

### Issue: "No matching version found for expo-linking"

**Solution:** You're using the wrong Expo SDK version. This project uses Expo SDK 49, not 54.

```bash
npm install --legacy-peer-deps
```

### Issue: "expo-router not found"

**Solution:** This project uses React Navigation, not expo-router. The migration is complete.

### Issue: "iOS extensions not showing up in Xcode"

**Solution:** You need to manually add them as targets (see step 4 in Getting Started).

### Issue: "Dashboard shows zero blocked calls"

**Solution:** Native metrics bridge not implemented yet. This is a known issue. See `BUILD_STATUS_AND_NEXT_STEPS.md` for implementation details.

### Issue: "Spam reporting doesn't work"

**Solution:** Backend not deployed yet. Update `src/services/api.ts` with production URL after deploying backend.

---

## 📚 Documentation

**Read these in order:**

1. `README.md` - Project overview
2. `BUILD_STATUS_AND_NEXT_STEPS.md` - Detailed status and roadmap
3. `SESSION_3_SUMMARY.md` - What was accomplished in Session 3
4. `PRIVACY_POLICY.md` - Privacy policy text
5. `TERMS_OF_SERVICE.md` - Terms of service text
6. `APP_STORE_METADATA.md` - App Store listing content

---

## 🎯 Next Steps (Priority Order)

1. **Configure iOS extensions in Xcode** (2-3 hours, Mac required)
2. **Test on physical iOS device** (1 hour)
3. **Test on physical Android device** (1 hour)
4. **Deploy backend proxy** (4 hours)
5. **Implement native metrics bridge** (1-2 days)
6. **Host privacy policy and terms** (2 hours)
7. **Implement spam database Phase 1** (1 week)
8. **Create app screenshots** (4 hours)
9. **Submit to App Store** (1 week review time)

---

## 💡 Pro Tips

1. **Always test on physical devices** - Call blocking doesn't work in simulators
2. **Don't upgrade Expo SDK** - Stay on SDK 49 until all dependencies support newer versions
3. **Use React Navigation** - Don't try to add expo-router back
4. **Read the docs** - Everything you need is in `BUILD_STATUS_AND_NEXT_STEPS.md`
5. **Ask questions** - If something is unclear, check the documentation first

---

## 🆘 Need Help?

1. Check `BUILD_STATUS_AND_NEXT_STEPS.md` for detailed information
2. Check `SESSION_3_SUMMARY.md` for what was done in Session 3
3. Check GitHub issues: https://github.com/kacicalvaresi-code/veto/issues
4. Review the code - it's well-commented

---

## ✅ Checklist for First Build

- [ ] Cloned repository
- [ ] Installed dependencies (`npm install`)
- [ ] Installed CocoaPods (`cd ios && pod install`)
- [ ] Opened in Xcode (`open ios/Veto.xcworkspace`)
- [ ] Added Call Directory Extension target
- [ ] Added Message Filter Extension target
- [ ] Added Action Extension target
- [ ] Configured App Groups for all targets
- [ ] Set bundle identifiers for all targets
- [ ] Built on iOS device
- [ ] Built on Android device
- [ ] Tested call blocking on physical device

---

**Good luck! The foundation is solid. You've got this! 🚀**
