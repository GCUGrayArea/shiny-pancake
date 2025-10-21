# Integration Testing Setup

## Firebase Security Rules for Testing

For integration tests to work, we need to temporarily use open security rules on Firebase.

### Setup for Integration Tests

1. **Deploy test rules** (open access - use only for testing):
   ```bash
   # From messageai-mvp directory
   firebase deploy --only database --token YOUR_TOKEN
   ```

   Or manually in Firebase Console:
   - Go to Firebase Console > Realtime Database > Rules
   - Replace with:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

2. **Run integration tests**:
   ```bash
   npm test -- firebase-user.service.integration.test.ts --testTimeout=30000
   ```

3. **Restore production rules** after testing:
   ```bash
   firebase deploy --only database
   ```

   Or manually restore the production rules from `firebase-rules/database-rules.json`

### ⚠️ IMPORTANT SECURITY NOTE

**NEVER leave the test rules deployed in production!** The test rules (`{ ".read": true, ".write": true }`) allow anyone to read/write your database. Always restore the production rules after testing.

### Current Status

The Firebase security rules currently deployed require authentication. To run integration tests:
1. Temporarily deploy open rules
2. Run tests
3. Immediately restore secure rules

### Alternative: Mock Firebase for Tests

For automated CI/CD, consider using Firebase Emulators instead of the live database:
```bash
firebase emulators:start --only database
```

Then set `FIREBASE_DATABASE_URL` in tests to point to `http://localhost:9000`

## Running Integration Tests

Integration tests connect to the actual Firebase instance and test real read/write operations.

### Prerequisites
- Firebase rules temporarily set to open (see above)
- `.env` file with Firebase configuration
- Internet connection

### Run Tests
```bash
npm test -- *.integration.test.ts --testTimeout=30000
```

### Expected Behavior
- Tests create temporary test users with UIDs like `test-user-*-integration`
- Tests clean up after themselves (delete test data)
- If tests fail mid-run, you may need to manually clean up test data in Firebase Console
