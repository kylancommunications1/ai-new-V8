import { GoogleGenAI, Modality } from '@google/genai';
import * as fs from "node:fs";
import pkg from 'wavefile';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { WaveFile } = pkg;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-live-2.5-flash-preview';
// Only using AUDIO modality as per documentation limitations
const config = { 
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Puck'
      }
    },
    languageCode: 'en-US'
  }
};

async function testMeaningOfLife() {
  console.log('Starting Gemini audio test for "meaning of life" question...');
  
  const responseQueue = [];
  const audioChunks = [];

  async function waitMessage() {
    let done = false;
    let message = undefined;
    while (!done) {
      message = responseQueue.shift();
      if (message) {
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return message;
  }

  async function handleTurn() {
    const turns = [];
    let done = false;
    while (!done) {
      const message = await waitMessage();
      turns.push(message);
      
      // Process audio data
      if (message.data) {
        console.log('Audio data received, length:', message.data.length);
        audioChunks.push(message.data);
      }
      
      // Check if turn is complete
      if (message.serverContent && message.serverContent.turnComplete) {
        done = true;
      }
    }
    return turns;
  }

  try {
    console.log('Connecting to Gemini Live API...');
    const session = await ai.live.connect({
      model: model,
      callbacks: {
        onopen: function () {
          console.log('Connection opened successfully');
        },
        onmessage: function (message) {
          responseQueue.push(message);
        },
        onerror: function (e) {
          console.error('Error:', e.message);
        },
        onclose: function (e) {
          console.log('Connection closed:', e.reason);
        },
      },
      config: config,
    });

    console.log('Sending question about the meaning of life to Gemini...');
    const inputTurns = 'What is the meaning of life?';
    session.sendClientContent({ turns: inputTurns });

    console.log('Waiting for response...');
    await handleTurn();

    // Save audio if we received any
    if (audioChunks.length > 0) {
      // Combine audio data strings and save as wave file
      const combinedAudio = audioChunks.reduce((acc, chunk) => {
        const buffer = Buffer.from(chunk, 'base64');
        const intArray = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Int16Array.BYTES_PER_ELEMENT);
        return acc.concat(Array.from(intArray));
      }, []);

      const audioBuffer = new Int16Array(combinedAudio);

      const wf = new WaveFile();
      wf.fromScratch(1, 24000, '16', audioBuffer);
      fs.writeFileSync('meaning_of_life.wav', wf.toBuffer());
      console.log('Audio saved to meaning_of_life.wav');
      
      // Print file size and location for verification
      const stats = fs.statSync('meaning_of_life.wav');
      console.log(`File size: ${stats.size} bytes`);
      console.log(`File path: ${process.cwd()}/meaning_of_life.wav`);
    } else {
      console.log('No audio data received');
    }

    // Close the session
    session.close();
    console.log('Test completed successfully');
    
    return audioChunks.length > 0;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

async function main() {
  const success = await testMeaningOfLife().catch(e => {
    console.error('Unhandled error:', e);
    return false;
  });
  
  console.log(`\nTest ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
  process.exit(success ? 0 : 1);
}

main();