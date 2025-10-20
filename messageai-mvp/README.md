# MessageAI MVP

A production-quality cross-platform messaging application built with React Native and Expo, featuring real-time message delivery, offline support, and group chat functionality.

## 🚀 Features

### MVP Features (Block 1-13)
- ✅ Email-based authentication
- ✅ Real-time one-on-one messaging
- ✅ Group chat (3-5 participants)
- ✅ Message persistence and offline support
- ✅ Optimistic UI updates
- ✅ Online/offline status indicators
- ✅ Message delivery states (sending, sent, delivered, read)
- ✅ Read receipts
- ✅ Image sending and receiving
- ✅ Push notifications
- ✅ Message timestamps

### Future Features (Post-MVP)
- Real-time translation
- Typing indicators
- Profile pictures
- Multi-language UI

## 📋 Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo Go app installed on your mobile device (iOS or Android)
- Firebase account with project created

## 🛠️ Technology Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Backend:** Firebase (Auth, Realtime Database, Storage, Cloud Messaging)
- **Local Storage:** Expo SQLite
- **Navigation:** React Navigation
- **UI Library:** React Native Paper
- **Testing:** Jest + React Native Testing Library

## 📦 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd messageai-mvp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Firebase
Follow the detailed instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) to:
- Create web apps (dev and prod)
- Enable Email/Password authentication
- Set up Realtime Database
- Configure Storage
- Deploy security rules

### 4. Configure environment variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and fill in your Firebase credentials
# Get these from Firebase Console > Project Settings > Your apps
```

Your `.env` file should look like:
```env
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=shiny-pancake.firebaseapp.com
FIREBASE_DATABASE_URL=https://shiny-pancake-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=shiny-pancake
FIREBASE_STORAGE_BUCKET=shiny-pancake.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## 🚀 Running the App

### Start the development server
```bash
npm start
```

This will start the Expo development server and show a QR code.

### Run on your device

#### Using Expo Go (Recommended for MVP testing)
1. Install Expo Go on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Scan the QR code from your terminal with:
   - iOS: Camera app
   - Android: Expo Go app

#### Using emulators
```bash
# Android emulator
npm run android

# iOS simulator (macOS only)
npm run ios
```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

### Coverage Goals
- Business logic: > 80%
- Utility functions: > 80%
- Service layer: > 80%

## 📁 Project Structure

```
messageai-mvp/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen-level components
│   ├── services/        # API, Firebase, storage services
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Pure utility functions
│   ├── contexts/        # React contexts (Auth, Theme, etc.)
│   ├── types/           # TypeScript interfaces/types
│   ├── constants/       # App constants
│   └── __tests__/       # Unit tests
├── assets/              # Images, fonts, etc.
├── firebase-rules/      # Firebase security rules
├── .env.example         # Example environment variables
├── FIREBASE_SETUP.md    # Firebase setup guide
└── README.md           # This file
```

## 🔧 Development Guidelines

### Code Organization
- **Maximum function length:** 75 lines
- **Maximum file length:** 750 lines
- **Separation of concerns:** UI, business logic, and data access in separate files
- **Component composition:** Prefer smaller, reusable components

### TypeScript
- Strict mode enabled
- All types defined in `src/types/`
- No `any` types (use `unknown` if truly needed)

### Testing
- Unit tests required for all business logic
- Use Jest for unit tests
- Use React Native Testing Library for component tests
- Mock Firebase services in tests

## 📱 App Architecture

### Data Flow
1. **UI Layer** (`screens/`, `components/`) - User interface and interactions
2. **Business Logic** (`services/`, `hooks/`) - Application logic
3. **Data Layer** (`services/local-*.service.ts`) - Local SQLite storage
4. **Sync Layer** (`services/sync.service.ts`) - Firebase real-time sync
5. **Backend** (Firebase) - Cloud storage and real-time database

### Offline Support
- Messages queued locally when offline
- Automatic sync when connection restored
- Optimistic UI for instant feedback
- No message loss on app crash

## 🔐 Security

- Firebase Authentication for user management
- Realtime Database security rules restrict access to authorized users
- Storage rules validate file types and sizes
- API keys stored in environment variables (not in code)
- Input validation on all user inputs

## 🐛 Troubleshooting

### App won't start
- Ensure all dependencies are installed: `npm install`
- Clear cache: `npx expo start -c`
- Verify `.env` file exists with correct Firebase credentials

### Can't connect to Firebase
- Check Firebase project ID matches your `.env`
- Verify security rules are deployed
- Check network connection
- Ensure Firebase services are enabled

### Tests failing
- Run `npm install` to ensure test dependencies are installed
- Clear Jest cache: `npx jest --clearCache`
- Check that mocks in `jest.setup.js` are correct

### Expo Go connection issues
- Ensure phone and computer are on same WiFi network
- Try restarting Expo dev server: `npx expo start -c`
- Check firewall settings

## 📝 Development Roadmap

### Block 1: Foundation ✅ (Current)
- [x] Project initialization
- [x] Firebase backend setup
- [x] Data models and TypeScript interfaces

### Block 2: Authentication (Next)
- [ ] Firebase auth service layer
- [ ] Auth context and secure storage
- [ ] Login/signup UI screens

### Block 3: Local Storage
- [ ] SQLite database setup
- [ ] Local data services (users, chats, messages)

### Block 4-13: Additional Features
See [PROJECT_TASKS_MVP.md](../PROJECT_TASKS_MVP.md) for complete task breakdown.

## 🤝 Contributing

This is an AI-driven development project with 100% AI-generated code following the PRD specifications.

## 📄 License

[Add license information]

## 📞 Support

For issues and questions:
- Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase configuration
- Review error messages in Expo DevTools
- Check Firebase Console for backend errors

---

**Built with ❤️ using React Native, Expo, and Firebase**
