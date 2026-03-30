# ⚡ RideWave

A stunning Uber-like ride-sharing app built with **React Native + Expo**.
Dark theme · Glassmorphism · Spring animations · Real-time trip tracking UI.

---

## ✨ Features

| Screen | Description |
|--------|-------------|
| 🚀 **Splash** | Animated logo with ripple rings |
| 📖 **Onboarding** | 3-slide parallax carousel |
| 🔐 **Auth** | Phone + OTP or social sign-in |
| 🗺️ **Home** | Live map with nearby drivers, dark style |
| 📍 **Destination** | Smart search with recent/saved places |
| 🚗 **Ride Options** | 4 ride tiers with pricing + map route |
| ⚡ **Matching** | Animated ripple driver search |
| 🛣️ **Active Trip** | Real-time tracking with trip phases |
| ⭐ **Rating** | Post-trip rating with compliments |
| 👤 **Profile** | Stats, rewards progress, settings |
| 🕐 **History** | Full trip history with filters |

## 🎨 Design System

- **Colors**: Electric teal (#00E5B3) + Deep purple (#7C3AED) on near-black
- **Effects**: Glassmorphism (BlurView), neon glows, gradient fills
- **Animations**: React Native Reanimated 2 — spring, timing, ripple, fade
- **Typography**: System font with weight scale from 400→900

## 🛠 Tech Stack

```
React Native 0.74     — Core framework
Expo SDK 51           — Managed workflow
React Navigation 6    — Stack + Bottom Tabs
React Native Maps     — MapView with custom dark style
Reanimated 2          — Smooth 60fps animations
Expo Blur             — Glassmorphism cards
Expo Linear Gradient  — Gradient fills & glows
Zustand               — Lightweight state management
TypeScript            — Full type safety
```

## 🚀 Getting Started

```bash
cd ridewave
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or run on a simulator.

### For Android APK (production build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build Android APK
eas build --platform android --profile preview
```

### For iOS

```bash
eas build --platform ios --profile preview
```

## 📱 App Flow

```
Splash → Onboarding → Auth
                        ↓
                     Home ←──────────────┐
                        ↓                │
                   Destination           │
                        ↓                │
                  Ride Options           │
                        ↓                │
                    Matching             │
                        ↓                │
                  Active Trip            │
                        ↓                │
                  Rating Screen ─────────┘
```

## 📁 Project Structure

```
ridewave/
├── App.tsx                    # Entry point
├── src/
│   ├── theme/index.ts         # Colors, spacing, typography
│   ├── store/useStore.ts      # Zustand global state + mock data
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Stack + Tab navigation
│   └── screens/
│       ├── SplashScreen.tsx
│       ├── OnboardingScreen.tsx
│       ├── AuthScreen.tsx
│       ├── HomeScreen.tsx
│       ├── DestinationScreen.tsx
│       ├── RideOptionsScreen.tsx
│       ├── MatchingScreen.tsx
│       ├── ActiveTripScreen.tsx
│       ├── RatingScreen.tsx
│       ├── ProfileScreen.tsx
│       └── HistoryScreen.tsx
```

---

Built with ❤️ using React Native + Expo
