# Veto — Roadmap Gap Analysis
**Date:** February 23, 2026  
**Scope:** Cross-reference of all planning documents vs. current codebase

---

## Summary

The app has a strong foundation: the onboarding flow, tab navigation, blocklist management, audit log, settings screen, Call Directory Extension, and native metrics bridge are all implemented. However, several high-priority items from the roadmaps remain unbuilt. The gaps fall into five categories: **Backend**, **iOS Native Features**, **App Features**, **Legal/Web**, and **Monetization**.

---

## ✅ What Is Implemented

| Area | Feature | Source |
|---|---|---|
| **Onboarding** | 3-screen onboarding flow (Welcome, Enable Blocking, Success) | UI/UX Roadmap Ph.2 |
| **Onboarding** | Guides user to Settings → Phone → Call Blocking & Identification | Roadmap v4 Ph.2 |
| **Navigation** | Tab navigation (Dashboard, Audit Log, Settings) | UI/UX Roadmap Ph.2 |
| **Blocklist** | Add/remove numbers with labels, SQLite storage | Roadmap v4 Ph.1 |
| **Blocklist** | Sync to App Group for Call Directory Extension | Roadmap v4 Ph.1 |
| **Call Blocking** | iOS Call Directory Extension (blocking + caller ID labels) | Roadmap v4 Ph.1 |
| **Call Blocking** | App Group (`group.com.kacicalvaresi.veto`) shared data | Roadmap v4 Ph.1 |
| **Audit Log** | Full audit log with search, filters, export (JSON) | Settings Audit doc |
| **Metrics** | Native metrics bridge (iOS Swift, React Native bridge) | Legal & Metrics doc |
| **Metrics** | Stats screen (total blocked, this week/month, time saved) | Feature Recs Tier 1 |
| **Settings** | Privacy policy link, ToS link, support email, clear data | UI/UX Roadmap Ph.2 |
| **Legal** | Privacy Policy (PRIVACY_POLICY.md) | Legal & Metrics doc |
| **Legal** | Terms of Service (TERMS_OF_SERVICE.md) | Legal & Metrics doc |
| **Backend** | Stateless Node.js proxy (Express, CORS, rate limiting) | Roadmap v4 Ph.1 |
| **Backend** | `/api/report` endpoint (anonymous reporting stub) | Roadmap v4 Ph.1 |
| **Backend** | `/api/reputation/:phoneNumber` endpoint (mock) | Roadmap v4 Ph.1 |
| **iOS Extensions** | Action Extension (ActionViewController.swift) | Roadmap v4 Ph.1 |
| **iOS Extensions** | SMS/Message Filter Extension (MessageFilterExtension.swift) | Roadmap v4 Ph.1 |
| **App Store** | EAS build pipeline configured (preview + production profiles) | Deployment workflow |

---

## ❌ What Is NOT Implemented (Gaps)

### 1. Backend — High Priority

| Gap | Description | Roadmap Source |
|---|---|---|
| **Backend not deployed** | The proxy server exists in code but is not running anywhere. The app points to `https://api.veto.app/api` in production, which returns nothing. | Roadmap v4 Ph.1 |
| **Call Control API not integrated** | The `/api/reputation` and `/api/report` routes use mock data. No real Call Control API key is configured. | Roadmap v4 Ph.1 |
| **No spam database** | No curated/public spam number database exists. The app only blocks numbers the user manually adds. | Feature Recs Tier 1 #1 |
| **No community blocklist endpoint** | Phase 3 calls for a pull-only community blocklist that the app downloads. No such endpoint exists. | Roadmap v4 Ph.3 |
| **No RevenueCat webhook handler** | RevenueCat is planned but no webhook endpoint exists to receive subscription events. | RevenueCat account |
| **No Twilio Lookup integration** | Phase 3 calls for anonymous carrier lookups to enrich spam reports. | Roadmap v4 Ph.3 |

---

### 2. iOS Native Features — High Priority

| Gap | Description | Roadmap Source |
|---|---|---|
| **Caller ID label "Spam - Use Veto Shortcut"** | The roadmap specifies labeling incoming spam calls with interactive text. Currently labels are set by the user (e.g., "Telemarketer") but the default "Spam - Use Veto Shortcut" label is not implemented. | Roadmap v4 Ph.1, UI/UX Ph.4 |
| **Lock Screen Shortcut onboarding (iOS 18+)** | No onboarding step guides users to add a "Report Spam" shortcut to their Lock Screen. | Roadmap v4 Ph.2 |
| **Action Button onboarding (iPhone 15 Pro+)** | No onboarding step guides users to assign the Action Button to "Report Spam". | Roadmap v4 Ph.2 |
| **Siri Shortcuts / Intent definitions** | No Siri Intent definitions exist for voice-controlled blocking. | Feature Recs Tier 3 #12 |
| **Privacy Manifest (PrivacyInfo.xcprivacy)** | Required for App Store submission since iOS 17. Not present in the project. | Legal & Metrics doc (C-05) |
| **CallDirectoryHandler → MetricsModule bridge** | The CallDirectoryHandler does not call VetoMetricsModule when it blocks a call, so the dashboard counter never increments from real blocked calls. | Legal & Metrics doc |

---

### 3. App Features — Medium Priority

| Gap | Description | Roadmap Source |
|---|---|---|
| **Smart blocking rules** | No UI or logic for pattern-based blocking (area codes, prefixes, international, no-caller-ID, time-based). | Feature Recs Tier 1 #2 |
| **Wildcard/pattern blocking** | No support for blocking number ranges (e.g., 1-800-XXX-XXXX). | Feature Recs Tier 1 #4 |
| **Whitelist management** | No whitelist feature to prevent false positives. | Feature Recs Tier 2 #8 |
| **Backup & restore** | Export to encrypted file / iCloud / AirDrop is not implemented. The audit log export (JSON) exists but the blocklist backup does not. | Roadmap v4 Ph.2, Feature Recs Tier 2 #9 |
| **Number reputation display** | The `/api/reputation` endpoint exists (mock) but the app never calls it to show a reputation badge on incoming calls. | Feature Recs Tier 2 #5 |
| **Spam trend alerts** | No push notification system for alerting users to new spam campaigns. | Feature Recs Tier 2 #6 |
| **Quick block from call log** | No Share Extension to block a number directly from the iOS call log. | Feature Recs Tier 2 #7 |
| **Guided government reporting** | No workflow for reporting to FTC/FCC/DoNotCall.gov. | Roadmap v4 Ph.2 |
| **SMS reporting to 7726** | No programmatic SMS reporting to the industry-standard shortcode. | Roadmap v4 Ph.2 |
| **Dark mode respects system setting** | App is dark-only; it does not respond to the system light/dark mode toggle. | UI/UX Roadmap Ph.3 |
| **Accessibility (VoiceOver)** | No `accessibilityLabel` props on interactive elements; VoiceOver support is incomplete. | UI/UX Roadmap Ph.4 |
| **Haptic feedback** | `expo-haptics` is installed but not wired to key actions (add/remove number). | UI/UX Roadmap Ph.4 |
| **SQLCipher encryption** | The blocklist uses plain `expo-sqlite`, not the encrypted SQLCipher variant. | Roadmap v4 Ph.1, README Ph.2 |
| **RevenueCat / in-app purchase** | No RevenueCat SDK integration in the app despite having an account. | RevenueCat account |

---

### 4. Legal & Web — High Priority (Pre-Submission Blockers)

| Gap | Description | Roadmap Source |
|---|---|---|
| **Privacy Policy web page** | The Settings screen links to `https://veto.app/privacy` but this URL does not exist. App Store will reject without it. | Legal & Metrics doc |
| **Terms of Service web page** | Same issue — `https://veto.app/terms` does not exist. | Legal & Metrics doc |
| **Governing law in ToS** | The Terms of Service has a placeholder `[Your State/Country]` that needs to be filled in. | Legal & Metrics doc |
| **veto.app website** | No website exists at all. Required for App Store submission and marketing. | README, Marketing Strategy |
| **support@veto.app email** | The support email is referenced throughout but has not been set up. | README, Legal docs |

---

### 5. Monetization — Medium Priority

| Gap | Description | Roadmap Source |
|---|---|---|
| **RevenueCat SDK not installed** | `react-native-purchases` is not in `package.json`. | RevenueCat account |
| **No paywall screen** | No UI for presenting a premium upgrade to users. | Feature Recs (pricing section) |
| **Pricing not finalized** | Documents reference both $1.99 and $2.99 one-time prices. Needs a decision. | README vs. Marketing Strategy |

---

## Recommended Priority Order

The following order is suggested based on what blocks App Store submission vs. what adds user value:

### Immediate (Pre-Submission Blockers)
1. **Deploy the backend** to the Starlight VPS
2. **Create veto.app website** with Privacy Policy and Terms of Service pages
3. **Add Privacy Manifest** (`PrivacyInfo.xcprivacy`) to the iOS project
4. **Fill in governing law** in Terms of Service
5. **Set up support@veto.app** email

### Short-Term (Before Launch, High Impact)
6. **Integrate Call Control API** into the backend (real spam reporting)
7. **Build spam database** — pull from FTC/FCC public data and serve via backend
8. **Wire CallDirectoryHandler → MetricsModule** so the dashboard counter works
9. **RevenueCat SDK integration** and paywall screen
10. **Smart blocking rules** (area codes, patterns)

### Medium-Term (Post-Launch Polish)
11. Lock Screen and Action Button onboarding steps
12. Whitelist management
13. Blocklist backup & restore
14. Number reputation display
15. Haptic feedback on key actions
16. Accessibility (VoiceOver labels)

### Long-Term (Phase 3–4)
17. Community blocklist (pull-only, anonymous)
18. Spam trend push notifications
19. Quick block Share Extension
20. AI on-device spam detection
21. Open source release + third-party privacy audit

---

## Build #14 Status

Build #14 (success screen image shift) is currently **in queue** on EAS. Download link will be posted as soon as it finishes.
