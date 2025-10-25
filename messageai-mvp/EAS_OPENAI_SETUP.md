# OpenAI API Key Setup for EAS Builds

## Problem
The OpenAI API key works in **Expo Go** but not in **EAS dev builds** because environment variables are handled differently in standalone builds.

## Solution

### Option 1: Quick Fix (Current)
The `app.config.js` now includes the OpenAI API key from your `.env` file:

```javascript
extra: {
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY
}
```

**To apply this fix:**
```bash
# Rebuild the dev build
eas build --profile development --platform android
```

### Option 2: Production (EAS Secrets - Recommended) ✅ ACTIVE
For production builds, use EAS Secrets to avoid committing API keys to git:

```bash
# Upload OpenAI configuration as secrets
eas secret:create --scope project --name OPENAI_API_KEY --value sk-your-key-here --type string
eas secret:create --scope project --name OPENAI_MODEL --value gpt-4o-mini --type string
eas secret:create --scope project --name OPENAI_MAX_TOKENS --value 1000 --type string
eas secret:create --scope project --name OPENAI_TEMPERATURE --value 0.3 --type string
eas secret:create --scope project --name OPENAI_TIMEOUT --value 30000 --type string

# Verify they were uploaded
eas secret:list
```

The `app.config.js` reads from these secrets during cloud builds:
```javascript
extra: {
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || process.env.EXPO_PUBLIC_OPENAI_MODEL,
  openaiMaxTokens: process.env.OPENAI_MAX_TOKENS || process.env.EXPO_PUBLIC_OPENAI_MAX_TOKENS,
  openaiTemperature: process.env.OPENAI_TEMPERATURE || process.env.EXPO_PUBLIC_OPENAI_TEMPERATURE,
  openaiTimeout: process.env.OPENAI_TIMEOUT || process.env.EXPO_PUBLIC_OPENAI_TIMEOUT
}
```

**This is now active** - the secrets have been uploaded and config updated.

## Verification

After rebuilding, check the console on app startup:
- ✅ **Success**:
  ```
  ✅ OpenAI client initialized
     Model: gpt-4o-mini
     Max Tokens: 1000
     Temperature: 0.3
     Timeout: 30000ms
  ```
- ❌ **Failure**: `⚠️ OpenAI API key not found. AI features will be disabled.`

## How It Works

**In Expo Go (local development):**
- Reads `EXPO_PUBLIC_OPENAI_API_KEY` from `.env` via `process.env`

**In EAS Builds (cloud builds):**
- Reads from `Constants.expoConfig.extra.openaiApiKey`
- This value is set in `app.config.js` at build time from `process.env.OPENAI_API_KEY`
- EAS injects the secret as `OPENAI_API_KEY` environment variable during build

**app.config.js (build time):**
```javascript
extra: {
  openaiApiKey: process.env.OPENAI_API_KEY ||           // ← EAS Secret (cloud builds)
                process.env.EXPO_PUBLIC_OPENAI_API_KEY  // ← .env file (local dev)
}
```

**App.tsx (runtime):**
```typescript
const apiKey = Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const model = Constants.expoConfig?.extra?.openaiModel || process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
const maxTokens = parseInt(Constants.expoConfig?.extra?.openaiMaxTokens || process.env.EXPO_PUBLIC_OPENAI_MAX_TOKENS || '1000', 10);
const temperature = parseFloat(Constants.expoConfig?.extra?.openaiTemperature || process.env.EXPO_PUBLIC_OPENAI_TEMPERATURE || '0.3');
const timeout = parseInt(Constants.expoConfig?.extra?.openaiTimeout || process.env.EXPO_PUBLIC_OPENAI_TIMEOUT || '30000', 10);
```

This multi-layered fallback ensures it works in all environments with sensible defaults.

## Required EAS Secrets

To complete the setup, upload these additional secrets if you haven't already:

```bash
# Check which secrets exist
eas secret:list

# Upload missing secrets (adjust values as needed)
eas secret:create --scope project --name OPENAI_MODEL --value gpt-4o-mini --type string
eas secret:create --scope project --name OPENAI_MAX_TOKENS --value 1000 --type string
eas secret:create --scope project --name OPENAI_TEMPERATURE --value 0.3 --type string
eas secret:create --scope project --name OPENAI_TIMEOUT --value 30000 --type string
```

**Note**: The OPENAI_API_KEY should already be uploaded. These additional secrets allow you to configure the AI behavior without rebuilding.

## Testing

1. **Local dev build**: Make sure `.env` has `EXPO_PUBLIC_OPENAI_API_KEY`
2. **Rebuild**: `eas build --profile development --platform android`
3. **Install and test**: All AI features (translation, smart replies, etc.) should work
4. **Check console**: Should see detailed initialization logs with all config values

## Security Note

⚠️ The OpenAI API key is embedded in the app binary. For production:
- Use EAS Secrets (never commit keys to git)
- Consider using a backend proxy to keep the key server-side
- Monitor API usage in OpenAI dashboard
- Set usage limits to prevent abuse
