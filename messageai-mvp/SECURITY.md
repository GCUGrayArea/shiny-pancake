# Security Guidelines

## Firebase Credentials

### ⚠️ CRITICAL: Never Hardcode Credentials

Firebase API keys and credentials must NEVER be hardcoded in source files. This includes:
- Test files
- Mock files
- Documentation files
- Comments
- Git commit messages

### ✅ Correct Approach: Runtime Loading

**Always load credentials from environment variables at runtime:**

```javascript
// ✅ CORRECT - Load from .env at runtime
require('dotenv').config();
const apiKey = process.env.FIREBASE_API_KEY;
```

```javascript
// ❌ WRONG - Hardcoded credentials
const apiKey = 'AIzaSyA6UmsDgvqL_3PCcOz5uSm_KPojCEXpR7M';
```

### Current Implementation

**Jest Mock (`jest.env.mock.js`):**
```javascript
require('dotenv').config();

module.exports = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  // ... other env vars loaded at runtime
};
```

This ensures:
- Credentials are never committed to git
- Each developer uses their own Firebase project
- CI/CD can inject different credentials per environment
- No credential rotation needed when code is shared

### .env File

The `.env` file contains sensitive credentials and is:
- ✅ Listed in `.gitignore`
- ✅ Never committed to version control
- ✅ Unique per developer/environment
- ✅ Loaded at runtime via `dotenv`

### Environment Variables

All Firebase configuration comes from these environment variables:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

### If Credentials Are Leaked

If Firebase credentials are accidentally committed:

1. **Immediately rotate the API key** in Firebase Console
2. **Remove the commit** from git history (if possible)
3. **Update local `.env` file** with new credentials
4. **Verify `.gitignore`** includes `.env`
5. **Review all code** for hardcoded credentials

### Best Practices

1. **Never screenshot** code with credentials visible
2. **Never paste** credentials in chat/issues/PRs
3. **Always use** environment variables
4. **Review commits** before pushing
5. **Use** `.env.example` for documentation (without real values)

### .env.example Template

Create a `.env.example` file (safe to commit) with placeholder values:

```bash
# Firebase Configuration
# Get these from Firebase Console > Project Settings > General > Your apps

FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
FIREBASE_APP_ID=your_app_id_here
```

### Testing

When writing tests that need Firebase credentials:
- ✅ Use `jest.env.mock.js` which loads from `.env`
- ✅ Mock Firebase functions when possible
- ❌ Never hardcode credentials in test files

### CI/CD

For continuous integration:
1. Set environment variables in CI/CD platform (GitHub Actions, CircleCI, etc.)
2. Use separate Firebase project for CI/CD
3. Never commit CI/CD credentials

## Summary

**Golden Rule:** If you can read the Firebase API key in the code, it's wrong. Credentials must always come from environment variables loaded at runtime.
