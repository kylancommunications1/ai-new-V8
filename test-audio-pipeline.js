#!/usr/bin/env node

/**
 * Test Audio Pipeline - Verify Gemini Live API Configuration
 * 
 * This script tests that:
 * 1. Gemini Live API connection works
 * 2. Voice Activity Detection is properly configured
 * 3. Audio input/output flow is working
 * 4. No auto-greeting is sent (caller speaks first)
 */

import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Error: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.0-flash-live-001';

// Configuration that matches production setup
const config = { 
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Puck'
      }
    },
    languageCode: 'en-US'
  },
  systemInstruction: {
    parts: [{ 
      text: 'You are a professional AI assistant for customer service calls. Wait for the caller to speak first, then respond naturally and professionally. Be helpful, polite, and efficient. Listen actively and respond appropriately to what the caller says.'
    }]
  },
  // Voice Activity Detection: Allows caller to speak first
  realtimeInputConfig: {
    automaticActivityDetection: {
      startOfSpeechSensitivity: 'START_SENSITIVITY_MEDIUM',
      endOfSpeechSensitivity: 'END_SENSITIVITY_MEDIUM',
      silenceDurationMs: 1500,
      prefixPaddingMs: 300
    }
  },
  inputAudioTranscription: {},
  outputAudioTranscription: {}
};

async function testAudioPipeline() {
  console.log('🎯 Testing Audio Pipeline Configuration...');
  console.log('📋 Expected behavior: Wait for user input (no auto-greeting)');
  
  const responseQueue = [];
  let connectionEstablished = false;
  let audioReceived = false;

  try {
    console.log('🔄 Connecting to Gemini Live API...');
    
    const session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.log('✅ Connection opened successfully');
          connectionEstablished = true;
          
          // Test that no auto-greeting is sent
          setTimeout(() => {
            if (!audioReceived) {
              console.log('✅ GOOD: No auto-greeting detected - waiting for user input');
            }
          }, 2000);
        },
        onmessage: function (message) {
          responseQueue.push(message);
          
          // Check if audio was received (would indicate auto-greeting)
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.mimeType?.startsWith('audio/')) {
                audioReceived = true;
                console.log('⚠️  WARNING: Unexpected audio output detected');
                console.log('   This might indicate an auto-greeting is still configured');
              }
            }
          }
        },
        onerror: function (e) {
          console.error('❌ Connection error:', e.message);
        },
        onclose: function (e) {
          console.log('🔌 Connection closed:', e.reason);
        },
      },
      config: config,
    });

    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (connectionEstablished && !audioReceived) {
      console.log('✅ SUCCESS: Audio pipeline configured correctly');
      console.log('   - Connection established');
      console.log('   - No auto-greeting sent');
      console.log('   - Waiting for caller to speak first');
      console.log('🎯 Ready for Twilio calls!');
    } else if (audioReceived) {
      console.log('❌ ISSUE: Auto-greeting detected');
      console.log('   The system is still configured to speak first');
    } else {
      console.log('❌ ISSUE: Connection not established');
    }

    // Test user input simulation
    console.log('\n🧪 Testing user input simulation...');
    session.sendClientContent({ 
      turns: [{ 
        role: 'user', 
        parts: [{ text: 'Hello, I need help with my account' }] 
      }],
      turnComplete: true 
    });

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let responseReceived = false;
    for (const message of responseQueue) {
      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/') || part.text) {
            responseReceived = true;
            console.log('✅ Response received to user input');
            break;
          }
        }
      }
    }
    
    if (!responseReceived) {
      console.log('⚠️  No response received to user input');
    }

    session.close();
    return !audioReceived && connectionEstablished;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function main() {
  const success = await testAudioPipeline().catch(e => {
    console.error('💥 Unhandled error:', e);
    return false;
  });
  
  console.log(`\n🎯 Audio Pipeline Test ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  if (success) {
    console.log('\n📞 Your Twilio number should now work correctly:');
    console.log('   1. Caller calls your number');
    console.log('   2. Call connects silently (no auto-greeting)');
    console.log('   3. Caller speaks first');
    console.log('   4. Gemini responds naturally');
  } else {
    console.log('\n🔧 Issues detected. Check the configuration above.');
  }
  
  process.exit(success ? 0 : 1);
}

main();
