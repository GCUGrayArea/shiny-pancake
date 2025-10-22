# Quick Start: Running Integration Tests

This is a quick reference for running integration tests with Firebase Emulators.

## Prerequisites

Ensure you're in the `messageai-mvp` directory:

```bash
cd messageai-mvp
```

## Step 1: Start Firebase Emulators

Open a terminal and run:

```bash
npm run emulator
```

**Wait for this message:**
```
✔  All emulators ready! It is now safe to connect your app.
```

**Keep this terminal running!** Do not close it.

**Optional:** Open http://127.0.0.1:4000 in your browser to view the Emulator UI.

## Step 2: Run Integration Tests

Open a **NEW** terminal (keep the emulator terminal running) and run:

```bash
cd messageai-mvp
npm run test:integration
```

## Expected Results

You should see output like:

```
PASS  src/__tests__/integration/user-sync.integration.test.ts
PASS  src/__tests__/integration/chat-sync.integration.test.ts
PASS  src/__tests__/integration/message-sync.integration.test.ts
PASS  src/__tests__/integration/sync-orchestration.integration.test.ts

Test Suites: 4 passed, 4 total
Tests:       XX passed, XX total
```

## If Tests Fail

1. **Check emulators are running** - Look for "All emulators ready!" message
2. **Check for port conflicts** - Make sure ports 9000, 9099, 9199, 4000 are free
3. **View emulator UI** - Go to http://127.0.0.1:4000 to see if data is being written
4. **Check console errors** - Look for connection errors in test output

## Running Individual Test Files

```bash
# Only user sync tests
npm run test:integration -- user-sync.integration.test.ts

# Only chat sync tests  
npm run test:integration -- chat-sync.integration.test.ts

# Only message sync tests
npm run test:integration -- message-sync.integration.test.ts

# Only orchestration tests
npm run test:integration -- sync-orchestration.integration.test.ts
```

## Stopping

1. **Stop tests:** Ctrl+C in test terminal
2. **Stop emulators:** Ctrl+C in emulator terminal

## Troubleshooting

### "Port already in use"

Kill processes on emulator ports:

**Windows PowerShell:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 9000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 9099).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 9199).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
```

**Mac/Linux:**
```bash
lsof -ti:9000 | xargs kill -9
lsof -ti:9099 | xargs kill -9
lsof -ti:9199 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### "ECONNREFUSED" error

Make sure emulators are running BEFORE starting tests.

### Tests timeout

Increase timeout:
```bash
npm run test:integration -- --testTimeout=60000
```

## Clean Slate

To start with fresh emulator data:

1. Stop emulators (Ctrl+C)
2. Delete `emulator-data/` directory (if it exists)
3. Start emulators again: `npm run emulator`
4. Run tests: `npm run test:integration`

## Full Documentation

See `EMULATOR_SETUP.md` for comprehensive documentation.


