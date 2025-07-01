# Audio Pipeline Fix - Documentation

## Issues Fixed

### 1. **Removed Auto-Greeting Configuration**
The system was configured to force Gemini to speak first immediately when calls connected. This prevented natural conversation flow where callers expect to speak first.

**Files Updated:**
- `/packages/server/src/server.js` - Removed auto-greeting in onReady callback
- `/packages/server/src/gemini-live-official.js` - Removed sendInitialGreeting method
- `/packages/server/src/agent-routing-service.js` - Updated default system instruction

**Changes Made:**
```javascript
// BEFORE (problematic):
systemInstruction: 'You MUST speak first immediately when the call connects...'
onReady: () => { socket.geminiLive.sendText('Hello! Thank you for calling...'); }

// AFTER (fixed):  
systemInstruction: 'Wait for the caller to speak first, then respond naturally...'
onReady: () => { console.log('Waiting for caller to speak first...'); }
```

### 2. **Improved Voice Activity Detection (VAD)**
Enhanced VAD configuration to properly handle natural conversation flow where the caller initiates the conversation.

**Configuration Added:**
```javascript
realtimeInputConfig: {
  automaticActivityDetection: {
    startOfSpeechSensitivity: 'START_SENSITIVITY_MEDIUM',
    endOfSpeechSensitivity: 'END_SENSITIVITY_MEDIUM',
    silenceDurationMs: 1500,  // Wait 1.5 seconds before considering speech ended
    prefixPaddingMs: 300      // Include 300ms before detected speech
  }
}
```

### 3. **Audio Flow Optimization**
- Ensured only inbound audio (from caller) is sent to Gemini
- Prevented feedback loops from outbound audio
- Maintained proper audio format conversion (μ-law ↔ PCM)

## How It Works Now

### Call Flow:
1. **Caller dials Twilio number**
2. **Twilio connects to WebSocket** (`/twilio` endpoint)
3. **Gemini Live session established** (but stays silent)
4. **Caller speaks first** → Audio sent to Gemini
5. **Gemini processes and responds** → Audio sent back to caller
6. **Natural conversation continues**

### Audio Pipeline:
```
Caller Voice → Twilio (μ-law) → Server (PCM 16kHz) → Gemini Live API
                                                          ↓
Caller Hears ← Twilio (μ-law) ← Server (PCM 24kHz) ← Gemini Response
```

## Testing

### 1. **Test Audio Pipeline Configuration**
```bash
node test-audio-pipeline.js
```
This script verifies:
- ✅ Gemini Live connection works
- ✅ No auto-greeting is sent
- ✅ System waits for user input
- ✅ Responds properly to user speech

### 2. **Test Twilio Integration**
```bash
# Start the server
npm start

# Call your Twilio number
# Expected behavior:
# 1. Call connects silently (no greeting)
# 2. You speak first: "Hello, I need help"  
# 3. Gemini responds naturally
```

## Configuration Environment Variables

```bash
# System instruction (updated to remove forced greeting)
DEFAULT_SYSTEM_INSTRUCTION="Wait for the caller to speak first, then respond naturally and professionally..."

# VAD Configuration (optional overrides)
GEMINI_START_SENSITIVITY="START_SENSITIVITY_MEDIUM"
GEMINI_END_SENSITIVITY="END_SENSITIVITY_MEDIUM" 
GEMINI_SILENCE_DURATION_MS="1500"
GEMINI_PREFIX_PADDING_MS="300"
```

## Troubleshooting

### If Gemini Still Speaks First:
1. Check system instructions in database (`ai_agents` table)
2. Verify no custom greetings are configured
3. Restart the server to apply changes
4. Test with `node test-audio-pipeline.js`

### If No Audio Response:
1. Check Gemini API key is valid
2. Verify Twilio webhook URL is correct
3. Check server logs for audio conversion errors
4. Ensure VAD sensitivity is not too high

### If Audio Quality Issues:
1. Check network latency to Gemini API
2. Verify audio format conversion is working
3. Test with different VAD sensitivity settings

## Key Files Modified

1. **`/packages/server/src/server.js`**
   - Main server configuration
   - Removed auto-greeting logic
   - Added proper VAD configuration

2. **`/packages/server/src/gemini-live-official.js`** 
   - Gemini Live client wrapper
   - Updated system instructions
   - Enhanced VAD configuration

3. **`/packages/server/src/agent-routing-service.js`**
   - Default agent configuration 
   - Updated system instruction template

4. **`/test-audio-pipeline.js`** (new)
   - Comprehensive testing script
   - Validates configuration changes

## Expected Results

✅ **Caller Experience:**
- Calls Twilio number
- Hears brief silence (connection establishing)
- Speaks naturally: "Hello, I need help with..."
- Receives immediate, contextual AI response
- Natural back-and-forth conversation

✅ **Technical Benefits:**
- Reduced latency (no forced greeting delay)
- Natural conversation flow
- Better caller experience
- Proper Voice Activity Detection
- No audio feedback loops

The audio pipeline should now work correctly with natural conversation flow where callers speak first and Gemini responds appropriately.
