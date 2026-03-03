# Veto — Technical Audit & Stack Summary

**Date:** February 23, 2026
**Author:** Manus AI

This document provides a comprehensive technical audit of the Veto application stack, including the frontend mobile app, iOS extensions, backend proxy, and overall architecture. It is intended to serve as a summary for security audits and technical reviews.

## 1. Executive Summary

Veto is a privacy-first spam call blocking application for iOS. Its core design principle is that all user data, including the blocklist and call history, remains exclusively on the user's device. The application is built with React Native and Expo, leveraging native iOS extensions written in Swift for call blocking and SMS filtering. A lightweight backend proxy, written in Node.js, is designed to anonymously query third-party reputation APIs, though this functionality is currently mocked.

The stack is modern, well-structured, and adheres to its privacy-first promise. The primary areas for immediate improvement before a public launch are the deployment of the backend proxy, the formal integration of RevenueCat for subscriptions, and the creation of a Privacy Manifest file as required by Apple.

## 2. Frontend Application (React Native)

The main application is a standard Expo (SDK 50) project using React Native 0.73.6 and TypeScript.

### 2.1. Core Technologies & Libraries

| Library | Version | Purpose |
|---|---|---|
| `react` | 18.2.0 | Core UI framework |
| `react-native` | 0.73.6 | Mobile application framework |
| `expo` | ~50.0.0 | Build and development toolkit |
| `@react-navigation/native` | ^6.1.7 | Screen navigation and routing |
| `expo-sqlite` | ~13.4.0 | Local on-device database for blocklist storage |
| `react-native-shared-group-preferences` | 1.1.24 | Data sharing between the main app and iOS extensions via App Groups |
| `@react-native-async-storage/async-storage` | 1.21.0 | Key-value storage for settings and onboarding status |
| `expo-blur`, `expo-linear-gradient` | ~12.9.2 | UI styling and visual effects |

### 2.2. Application Structure

The application's source code is organized logically under the `src/` directory:

- **`components/`**: Reusable UI components (`OnboardingScreen`, `BlocklistManager`, `GlassCard`, etc.).
- **`screens/`**: Top-level screens corresponding to the main tabs (Home, Stats, Audit Log, Settings) and the onboarding flow.
- **`services/`**: Core logic for database interactions (`database.ts`), API calls (`api.ts`), and audit logging (`auditLog.ts`).
- **`utils/`**: Helper functions, such as phone number validation and formatting (`phoneNumber.ts`).
- **`modules/`**: Native module bridges (`MetricsModule.ts`).

### 2.3. Data Management

- **Blocklist**: Stored in a local SQLite database (`veto.db`) via `expo-sqlite`. This ensures data persistence and efficient querying on the device.
- **Settings & Flags**: Simple key-value data, like onboarding completion status, is stored using `@react-native-async-storage/async-storage`.
- **Data Sharing with Extensions**: The `react-native-shared-group-preferences` library is used to write the blocklist from the React Native app into the shared `UserDefaults` of the `group.com.kacicalvaresi.veto` App Group. This is the critical link that allows the native iOS extensions to access the blocklist.

## 3. iOS Native Extensions (Swift)

Veto utilizes several native iOS extensions to perform its core functions at the operating system level. These are written in Swift and managed via custom Expo plugins.

### 3.1. Call Directory Extension (`CallDirectoryHandler`)

- **File**: `ios/CallDirectoryHandler/CallDirectoryHandler.swift`
- **Purpose**: This is the primary extension for blocking calls. When an incoming call is received, iOS consults this extension.
- **Mechanism**: It reads the list of phone numbers from the shared `UserDefaults` (populated by the main app) and provides them to the CallKit framework. The system then blocks any matching incoming numbers. The process is extremely efficient and happens entirely on-device.

### 3.2. SMS/Message Filter Extension (`MessageFilterExtension`)

- **File**: `ios/MessageFilter/MessageFilterExtension.swift`
- **Purpose**: Filters incoming SMS/MMS messages from unknown senders.
- **Mechanism**: Similar to the call directory, it checks the sender's phone number against the shared blocklist. If a match is found, the message is classified as `.junk`. This functionality is basic and does not currently perform content-based filtering.

### 3.3. Action Extension (`ActionViewController`)

- **File**: `ios/Action/ActionViewController.swift`
- **Purpose**: Allows users to report a spam message directly from the Messages app via the share sheet.
- **Mechanism**: When activated, it pre-populates an SMS to be sent to the GSMA's official spam reporting number (`7726`). This is a clever, privacy-preserving way to facilitate reporting without handling the message content on a server.

## 4. Backend Proxy (Node.js)

A lightweight backend server is included in the project but is not yet deployed. Its purpose is to act as an anonymizing proxy for future integrations.

- **Files**: `backend/proxy/server.js`, `backend/proxy/routes.js`
- **Framework**: Express.js
- **Dependencies**: `express`, `cors`, `axios`, `dotenv`, `express-rate-limit`.
- **Functionality**:
  - **`/api/reputation/:phoneNumber`**: A (currently mocked) endpoint intended to query a third-party reputation service like Call Control. It is designed to forward the request without any user-identifying information.
  - **`/api/report`**: A (currently mocked) endpoint for receiving anonymized spam reports from the app.
- **Security**: Implements basic rate limiting and CORS protection.
- **Deployment**: Intended to be deployed on the Starlight VPS using a process manager like PM2.

## 5. Build & Deployment (Expo EAS)

The project is configured for builds and deployments using Expo Application Services (EAS).

- **Configuration**: `eas.json`
- **Profiles**: Defines `development`, `preview`, and `production` build profiles.
- **Credentials**: The `preview` profile is configured to use `local` credentials, meaning it relies on provisioning profiles and certificates stored locally in the project (`ios/certs/`). This was necessary to handle the multi-target setup (main app + extensions) correctly.
- **Continuous Integration**: While not formally set up, the `eas build` command is the foundation for CI/CD, allowing for automated builds triggered by git pushes.

## 6. Security & Privacy

Security and privacy are the central tenets of the Veto architecture.

- **No User Data Storage**: The application and its backend are architected to be stateless regarding user data. No phone numbers, contacts, or call logs are ever transmitted to or stored on a server.
- **On-Device Processing**: All call blocking and filtering logic occurs locally on the user's device.
- **Anonymized Proxy**: The backend is designed to act as a simple, anonymized proxy, stripping any identifying information before potentially querying external APIs.
- **App Group Data Sharing**: Data is shared between the app and its extensions securely via an iOS App Group, which is sandboxed to the app.
- **Missing Privacy Manifest**: A `PrivacyInfo.xcprivacy` file needs to be created. This file must declare the types of data the app uses and the reasons for any required API usage. For Veto, this will be minimal, primarily declaring the use of `UserDefaults` for the App Group.

## 7. Gaps & Recommendations

Based on the audit, the following are the key recommendations:

1.  **Deploy Backend Proxy**: The Node.js proxy server needs to be deployed to the Starlight VPS. This involves setting up the environment, installing dependencies, configuring environment variables (`.env`), and running the server with PM2.
2.  **Create Privacy Manifest**: Create and configure the `PrivacyInfo.xcprivacy` file in the Xcode project to comply with Apple's latest App Store requirements.
3.  **Integrate RevenueCat**: Although a RevenueCat account exists, the SDK is not yet integrated. This involves installing the `react-native-purchases` package and adding logic to the app to handle subscriptions and unlock premium features.
4.  **Implement Real Reputation API**: Replace the mocked responses in the backend proxy with actual API calls to a service like Call Control, using the server-side API key.
5.  **Finalize Website Deployment**: Complete the deployment of the `vetospam.app` website to the Spaceship hosting account, including connecting the domain and configuring the support form.

This audit confirms that the Veto application is well-architected to deliver on its promise of privacy-first call blocking. The identified gaps are primarily related to deployment and the integration of third-party services, which can be addressed systematically before a public launch.
