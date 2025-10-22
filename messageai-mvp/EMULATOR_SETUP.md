# Firebase Emulator Setup Guide

## Overview

Firebase Emulators allow you to run integration tests locally without exposing your production database. This guide walks you through setup and usage.

## Prerequisites

- ✅ Firebase CLI installed (`firebase --version` should show 14.19.1 or higher)
- ✅ Node.js and npm installed
- ✅ Project dependencies installed (`npm install`)

## Configuration Files

The following files have been created for emulator support:

- **`firebase.json`** - Emulator configuration (ports, hosts)
- **`.firebaserc`** - Project alias configuration
- **`firebase-rules/database-rules-emulator.json`** - Open rules for testing
- **`firebase-rules/storage-rules.txt`** - Storage security rules
- **`src/__tests__/integration/emulator-setup.ts`** - Auto-connects tests to emulators

## Emulator Ports

| Service  | Port | URL                       |
|----------|------|---------------------------|
| Database | 9000 | http://127.0.0.1:9000     |
| Auth     | 9099 | http://127.0.0.1:9099     |
| Storage  | 9199 | http://127.0.0.1:9199     |
| UI       | 4000 | http://127.0.0.1:4000     |

## Quick Start

### 1. Start Emulators

In one terminal, start the Firebase Emulators:

```bash
cd messageai-mvp
npm run emulator
```

**Expected output:**
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────┬────────────────┬─────────────────────────────────┐
│ Emulator    │ Host:Port      │ View in Emulator UI             │
├─────────────┼────────────────┼─────────────────────────────────┤
│ Database    │ 127.0.0.1:9000 │ http://127.0.0.1:4000/database  │
│ Auth        │ 127.0.0.1:9099 │ http://127.0.0.1:4000/auth      │
│ Storage     │ 127.0.0.1:9199 │ http://127.0.0.1:4000/storage   │
└─────────────┴────────────────┴─────────────────────────────────┘
```

**Emulator UI:** Open http://127.0.0.1:4000 in your browser to see the emulator dashboard.

### 2. Run Integration Tests

In a separate terminal:

```bash
cd messageai-mvp
npm run test:integration
```

This will:
1. Connect to the running emulators automatically
2. Run all integration tests in `src/__tests__/integration/`
3. Clean up test data after each test

## Running Specific Test Files

```bash
# Run only user sync tests
npm run test:integration -- user-sync.integration.test.ts

# Run only chat sync tests
npm run test:integration -- chat-sync.integration.test.ts

# Run only message sync tests
npm run test:integration -- message-sync.integration.test.ts

# Run orchestration tests
npm run test:integration -- sync-orchestration.integration.test.ts
```

## Running Tests in Watch Mode

```bash
npm run test:integration -- --watch
```

## Viewing Test Data

While emulators are running, you can:

1. **View in Browser:** Go to http://127.0.0.1:4000
2. **Navigate to Database:** Click "Realtime Database" in the UI
3. **See Test Data:** You'll see nodes like:
   - `/users/test-<timestamp>-<id>`
   - `/chats/test-<timestamp>-<id>`
   - `/messages/test-<timestamp>-<id>`

Test data is automatically cleaned up after tests complete.

## Exporting/Importing Emulator Data

### Export Data (for repeatable tests)

```bash
npm run emulator:export
```

This saves emulator data to `./emulator-data/` directory.

### Import Data (start with pre-populated data)

```bash
npm run emulator:import
```

This starts emulators with data from `./emulator-data/`.

**Use Case:** If you want to test against a specific database state, export it once and import it for future test runs.

## Troubleshooting

### Error: "Port already in use"

**Problem:** Another process is using emulator ports (9000, 9099, 9199, 4000)

**Solution:**
```bash
# Find and kill processes using the ports (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 9000).OwningProcess | Stop-Process -Force

# Or on Mac/Linux
lsof -ti:9000 | xargs kill -9
```

### Error: "ECONNREFUSED" during tests

**Problem:** Emulators not running when tests started

**Solution:** Make sure emulators are running BEFORE running tests:
```bash
# Terminal 1
npm run emulator

# Wait for "All emulators ready!"

# Terminal 2
npm run test:integration
```

### Error: "Auth Emulator connection already established"

**Problem:** Tests trying to connect to emulators multiple times

**Solution:** This is expected and handled gracefully. The error is logged but doesn't break tests.

### Tests are slow

**Problem:** Firebase emulator I/O can be slower than mocked tests

**Solution:** This is normal. Integration tests are slower but test real functionality. Unit tests remain fast.

**Typical speeds:**
- Unit tests: ~5-10 seconds for all tests
- Integration tests: ~30-60 seconds for all tests

## Emulator vs Production

| Aspect           | Emulator                  | Production                |
|------------------|---------------------------|---------------------------|
| Security Rules   | Open (no auth required)   | Strict (auth required)    |
| Data Persistence | Local only, can be wiped  | Cloud, permanent          |
| Cost             | Free                      | Pay for reads/writes      |
| Speed            | Fast (local)              | Network latency           |
| Safety           | 100% safe for testing     | ⚠️ Can affect real users  |

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start Firebase Emulators
  run: |
    cd messageai-mvp
    npm run emulator &
    sleep 10  # Wait for emulators to start

- name: Run Integration Tests
  run: |
    cd messageai-mvp
    npm run test:integration
```

## Integration Test Structure

```typescript
// All integration tests auto-connect to emulators via:
import { connectToEmulators } from './emulator-setup';
connectToEmulators();

// Tests then use real Firebase and SQLite (no mocks!)
const result = await FirebaseUserService.createUserInFirebase(testUser);
expect(result.success).toBe(true);

// Data is created in emulator, not production
// Automatically cleaned up after test
```

## Best Practices

1. **Always run emulators locally** - Never run integration tests against production
2. **Clean up test data** - Use `firebaseHelper.cleanup()` in test teardown
3. **Use unique IDs** - Test helpers generate unique IDs to avoid collisions
4. **Keep emulators running** - Start once, run many test iterations
5. **Check emulator UI** - When debugging, view data in http://127.0.0.1:4000

## Security Notes

- ✅ **Emulators are 100% local** - No data goes to Firebase Cloud
- ✅ **Open rules are safe** - Only applied to local emulators
- ✅ **Production is protected** - Your production database is unaffected
- ⚠️ **Don't deploy emulator rules** - Keep open rules local only

## Next Steps

1. **Start emulators:** `npm run emulator` (Terminal 1)
2. **Run integration tests:** `npm run test:integration` (Terminal 2)
3. **View results:** Check http://127.0.0.1:4000 for live data
4. **Fix any failing tests** - Integration tests may reveal real-world issues
5. **Commit working tests** - Once all green, commit the test suite

## Commands Summary

```bash
# Start emulators (keep running)
npm run emulator

# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- user-sync.integration.test.ts

# Run unit tests (still work, don't need emulators)
npm test

# Export emulator data
npm run emulator:export

# Import emulator data
npm run emulator:import
```

## Status

- ✅ Emulator configuration complete
- ✅ Test setup auto-connects to emulators
- ✅ NPM scripts added
- ⏳ Integration tests ready to run
- ⏳ Awaiting first test run validation

**Ready to test!** Start the emulators and run the integration test suite.


