# Firebase Setup Guide for MessageAI MVP

## Prerequisites
- Firebase project `shiny-pancake` already created
- Firebase Console open

## Step 1: Create Apps in Firebase Project

You'll need to create TWO apps in your Firebase project (one for dev, one for prod):

### 1.1 Development App
1. In Firebase Console, go to Project Overview
2. Click "Add app" and select **Web** (</> icon)
3. Register app with nickname: `messageai-dev`
4. **Check** "Also set up Firebase Hosting" (optional but recommended)
5. Click "Register app"
6. Copy the `firebaseConfig` object - you'll need this for `.env` file

### 1.2 Production App
1. Click "Add app" again and select **Web**
2. Register app with nickname: `messageai-prod`
3. Click "Register app"
4. Copy the `firebaseConfig` object for production

## Step 2: Enable Firebase Authentication

1. In Firebase Console sidebar, click **Authentication**
2. Click "Get started"
3. Click on "Sign-in method" tab
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle **Enable** to ON
   - Toggle **Email link (passwordless sign-in)** to OFF (not needed for MVP)
   - Click "Save"

## Step 3: Create Firebase Realtime Database

1. In Firebase Console sidebar, click **Realtime Database**
2. Click "Create Database"
3. Select location: Choose closest to your users (e.g., `us-central1`)
4. Start in **TEST MODE** for now (we'll add security rules in Step 6)
5. Click "Enable"

**Copy your database URL** - it will look like:
```
https://shiny-pancake-default-rtdb.firebaseio.com
```

## Step 4: Set Up Firebase Storage

1. In Firebase Console sidebar, click **Storage**
2. Click "Get started"
3. Start in **TEST MODE** for now (we'll add security rules in Step 6)
4. Select location: Use the same region as your database
5. Click "Done"

**Copy your storage bucket** - it will look like:
```
shiny-pancake.appspot.com
```

## Step 5: Set Up Firebase Cloud Messaging (FCM)

1. In Firebase Console sidebar, click **Project settings** (gear icon)
2. Go to "Cloud Messaging" tab
3. Under "Cloud Messaging API (Legacy)", you may see it's disabled
4. For now, note that FCM is available - detailed setup will come in Block 10

## Step 6: Deploy Security Rules

### 6.1 Realtime Database Security Rules
1. Go to **Realtime Database** in Firebase Console
2. Click on "Rules" tab
3. Replace the existing rules with the content from `firebase-rules/database-rules.json`
4. Click "Publish"

### 6.2 Storage Security Rules
1. Go to **Storage** in Firebase Console
2. Click on "Rules" tab
3. Replace the existing rules with the content from `firebase-rules/storage-rules.txt`
4. Click "Publish"

## Step 7: Create Environment File

1. In your project root (`messageai-mvp` folder), create a file named `.env`
2. Copy the contents from `.env.example`
3. Fill in the values from the `firebaseConfig` you copied in Step 1.1 (dev app):

```env
FIREBASE_API_KEY=AIzaSy... (apiKey from firebaseConfig)
FIREBASE_AUTH_DOMAIN=shiny-pancake.firebaseapp.com (authDomain)
FIREBASE_DATABASE_URL=https://shiny-pancake-default-rtdb.firebaseio.com (databaseURL)
FIREBASE_PROJECT_ID=shiny-pancake (projectId)
FIREBASE_STORAGE_BUCKET=shiny-pancake.appspot.com (storageBucket)
FIREBASE_MESSAGING_SENDER_ID=123456789 (messagingSenderId)
FIREBASE_APP_ID=1:123456789:web:abc123... (appId)
```

**Note:** For production, you would create a separate `.env.production` file with the prod app credentials.

## Step 8: Verify Setup

After completing all steps, you should have:
- ✅ Two web apps registered (dev and prod)
- ✅ Email/Password authentication enabled
- ✅ Realtime Database created with security rules
- ✅ Storage configured with security rules
- ✅ `.env` file created with your Firebase config

## Next Steps

Once Firebase setup is complete:
1. The app will connect to Firebase on first run
2. You'll be able to create test accounts
3. Messages will be stored in the Realtime Database
4. Images will be uploaded to Firebase Storage

## Troubleshooting

### Can't find firebaseConfig
- In Project Settings > General, scroll down to "Your apps"
- Click on the web app you created
- The config is in the "SDK setup and configuration" section

### Database URL not found
- Make sure you created a **Realtime Database**, not Firestore
- The URL format should be `https://PROJECT-ID-default-rtdb.firebaseio.com`

### Security rules errors
- Make sure you're copying the rules to the correct service (Database vs Storage)
- Syntax errors will show up before you publish
- Test mode rules are permissive - production rules restrict access properly
