import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-live-2.5-flash-preview';
const config = { responseModalities: [Modality.TEXT] }; // Using TEXT modality

async function testGeminiText() {
  console.log('Starting Gemini text modality test...');
  
  const responseQueue = [];

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
      console.log('Received message:', JSON.stringify(message, null, 2));
      
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
          console.log('Message received');
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

    console.log('Sending test message to Gemini...');
    const inputTurns = 'Hello, can you confirm that you are receiving this message?';
    session.sendClientContent({ turns: inputTurns });

    console.log('Waiting for response...');
    const turns = await handleTurn();
    
    // Extract and display text responses
    const textResponses = turns
      .filter(turn => turn.serverContent && turn.serverContent.modelTurn && 
               turn.serverContent.modelTurn.parts && 
               turn.serverContent.modelTurn.parts[0].text)
      .map(turn => turn.serverContent.modelTurn.parts[0].text)
      .join('');
    
    console.log('\n--- Complete Response ---');
    console.log(textResponses || 'No text response received');
    console.log('------------------------\n');

    // Close the session
    session.close();
    console.log('Test completed successfully');
    
    return textResponses ? true : false;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

async function main() {
  const success = await testGeminiText().catch(e => {
    console.error('Unhandled error:', e);
    return false;
  });
  
  console.log(`\nTest ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
  process.exit(success ? 0 : 1);
}

main();