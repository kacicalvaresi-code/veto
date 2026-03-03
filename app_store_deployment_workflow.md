# App Store Deployment Workflow

This document outlines the comprehensive workflow for deploying the Veto iOS and Android apps to the Apple App Store and Google Play Store, respectively. It covers all phases from final build to live submission, leveraging Expo Application Services (EAS) for streamlined delivery.

## Table of Contents
1.  [Prerequisites](#prerequisites)
2.  [Phase 1: Final Build & Local Testing](#phase-1-final-build--local-testing)
3.  [Phase 2: App Store Connect & Google Play Console Setup](#phase-2-app-store-connect--google-play-console-setup)
4.  [Phase 3: EAS Submit](#phase-3-eas-submit)
5.  [Phase 4: App Review](#phase-4-app-review)
6.  [Phase 5: Release](#phase-5-release)

---

## Prerequisites

Before initiating the submission process, ensure the following prerequisites are met:

| Item | Description | Status |
| :--- | :--- | :--- |
| **Apple Developer Account** | An active, paid membership in the Apple Developer Program is required to publish on the App Store. [1] | Assumed Complete |
| **Google Play Developer Account** | A registered, paid developer account is necessary for publishing on the Google Play Store. [2] | Assumed Complete |
| **Completed App** | The app should be feature-complete, stable, and thoroughly tested. | In Progress |
| **App Store Assets** | All required metadata and creative assets (icon, screenshots, app previews) must be prepared. | Pending |
| **Privacy Policy** | A publicly accessible privacy policy URL is mandatory for both stores. [3] | Pending |

## Phase 1: Final Build & Local Testing

The first step is to create a final, production-ready build of the application. This build should be configured for release, with all debugging features disabled and performance optimizations enabled.

```bash
# Create a production build for both platforms
npx eas build --platform all --profile production
```

Once the build is complete, it must be installed on physical test devices for a final round of quality assurance. This step is critical to catch any platform-specific bugs that may not have been apparent during simulator testing.

## Phase 2: App Store Connect & Google Play Console Setup

While the build is running, prepare the app listings in both App Store Connect and the Google Play Console. This involves creating the app record and filling out all required metadata.

### Apple App Store Connect [4]

1.  **Create App Record**: In App Store Connect, navigate to "My Apps" and click the "+" icon to add a new app.
2.  **App Information**: Fill in the app name, primary language, bundle ID, and SKU.
3.  **Product Page**: Upload all prepared assets:
    *   App Icon (1024x1024 px)
    *   Screenshots (for various device sizes)
    *   App Previews (optional video trailers)
4.  **Metadata**: Write a compelling app description, and enter keywords, categories, and your privacy policy URL.
5.  **Pricing and Availability**: Set the price tier (or free) and the territories where the app will be available.

### Google Play Console [5]

1.  **Create App**: In the Play Console, click "Create app" and provide the app name, default language, and whether it is an app or a game.
2.  **Store Listing**: Complete the main store listing with the app title, short description, full description, and all graphical assets (icon, feature graphic, screenshots).
3.  **Content Rating**: Complete the content rating questionnaire to determine the app's age rating.
4.  **Pricing & Distribution**: Set the app as free or paid and select the countries for distribution.
5.  **App Content**: Fill out all required sections, including Target Audience, Data Safety, and the privacy policy URL.

## Phase 3: EAS Submit

With the build complete and the store listings prepared, use EAS Submit to upload the application binary to both stores. EAS automates the complex process of interacting with the store APIs. [6]

```bash
# Submit the latest production build to both stores
npx eas submit --platform all --profile production --latest
```

EAS will prompt you to select the build and will handle the upload and submission process. For the App Store, EAS will upload the IPA to TestFlight. From there, you will submit it for review.

## Phase 4: App Review

After submission, the app enters the review process for each store. The review teams will check the app for compliance with their respective guidelines.

*   **Apple App Review**: This process is typically more stringent and can take anywhere from a few hours to several days. [7] You will be notified of any rejections with specific reasons, which must be addressed before resubmitting.
*   **Google Play Review**: This process is often faster and more automated, but apps can still be rejected for policy violations. [8]

## Phase 5: Release

Once the app is approved, you can release it to the public.

*   **App Store**: You can choose to release the app manually from App Store Connect or have it released automatically immediately after approval.
*   **Google Play**: The app will be published automatically after it passes review.

---

## References
[1] Apple Developer Program. (n.d.). *Apple Developer*. Retrieved February 23, 2026, from https://developer.apple.com/programs/

[2] Google Play Console. (n.d.). *Google Play*. Retrieved February 23, 2026, from https://play.google.com/console

[3] App Store Review Guidelines - 5.1 Privacy. (n.d.). *Apple Developer*. Retrieved February 23, 2026, from https://developer.apple.com/app-store/review/guidelines/#privacy

[4] App Store Connect. (n.d.). *Apple Developer*. Retrieved February 23, 2026, from https://developer.apple.com/app-store-connect/

[5] Prepare your app for review. (n.d.). *Play Console Help*. Retrieved February 23, 2026, from https://support.google.com/googleplay/android-developer/answer/9859455

[6] Submit to app stores. (2026, February 11). *Expo Documentation*. Retrieved February 23, 2026, from https://docs.expo.dev/deploy/submit-to-app-stores/

[7] App Review. (n.d.). *Apple Developer*. Retrieved February 23, 2026, from https://developer.apple.com/app-store/review/

[8] App review process. (n.d.). *Play Console Help*. Retrieved February 23, 2026, from https://support.google.com/googleplay/android-developer/answer/10872882
