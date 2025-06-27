import { GoogleGenAI, Modality } from '@google/genai';

export class GeminiLiveOfficial {
  constructor(options) {
    this.options = options;
    this.geminiSession = null; // Initialize session to null
    this.onReady = options.onReady;
    this.onServerContent = options.onServerContent;
    this.onError = options.onError;
    this.onClose = options.onClose;
  }

  async connect() {
    try {
      const ai = new GoogleGenAI({apiKey: this.options.apiKey});
      
      // Configure according to the latest API specifications
      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: this.options.speechConfig || {
          voiceConfig: { 
            prebuiltVoiceConfig: { 
              voiceName: "default" 
            } 
          }
        },
        systemInstruction: this.options.systemInstruction || "You are a helpful AI assistant on a phone call. Be concise and conversational.",
      };

      console.log('🔄 Connecting to Gemini Live API...');
      
      this.geminiSession = await ai.live.connect({
        model: this.options.model || 'gemini-live-2.5-flash-preview',
        config: config, // Pass config as a separate property
        callbacks: {
          onopen: () => {
            console.log('✅ Gemini session established.');
            if (this.onReady) this.onReady();
          },
          onmessage: (message) => {
            console.log('📨 Received message from Gemini:', JSON.stringify(message.serverContent || {}, null, 2).substring(0, 200) + '...');
            if (this.onServerContent) this.onServerContent(message.serverContent || message);
          },
          onerror: (error) => {
            console.error('❌ Gemini session error:', error);
            if (this.onError) this.onError(error);
          },
          onclose: () => {
            console.log('ℹ️ Gemini session closed.');
            if (this.onClose) this.onClose();
          },
        },
      });
      
      console.log('🎉 Gemini session connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Gemini:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Method for sending text (like an initial greeting)
  sendText(text) {
    if (!this.geminiSession) {
      console.error('Cannot send text, Gemini session not ready.');
      return false;
    }
    
    try {
      console.log(`🗣️ Sending text to Gemini: "${text}"`);
      this.geminiSession.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending text to Gemini:', error);
      return false;
    }
  }

  // Method for streaming audio
  sendAudio(base64AudioChunk) {
    if (!this.geminiSession) {
      console.error('Cannot send audio, Gemini session not ready.');
      return false;
    }
    
    try {
      this.geminiSession.sendRealtimeInput({
        audio: { 
          data: base64AudioChunk,
          mimeType: "audio/pcm;rate=16000" 
        },
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending audio to Gemini:', error);
      return false;
    }
  }

  // Method for handling function call responses
  sendFunctionResponse(functionName, response) {
    if (!this.geminiSession) {
      console.error('Cannot send function response, Gemini session not ready.');
      return false;
    }
    
    try {
      console.log(`🔧 Sending function response for "${functionName}" to Gemini`);
      this.geminiSession.sendClientContent({
        turns: [{
          role: 'function',
          parts: [{ functionResponse: { name: functionName, response } }]
        }],
        turnComplete: true
      });
      return true;
    } catch (error) {
      console.error('❌ Error sending function response to Gemini:', error);
      return false;
    }
  }

  // Method to end the audio stream (useful for VAD)
  sendAudioStreamEnd() {
    if (!this.geminiSession) return false;
    
    try {
      this.geminiSession.sendRealtimeInput({ audioStreamEnd: true });
      console.log('🔚 Sent audio stream end signal');
      return true;
    } catch (error) {
      console.error('❌ Error sending audio stream end:', error);
      return false;
    }
  }

  // Close the session
  close() {
    if (this.geminiSession) {
      try {
        this.geminiSession.close();
        console.log('👋 Gemini session closed');
      } catch (error) {
        console.error('❌ Error closing Gemini session:', error);
      } finally {
        this.geminiSession = null;
      }
    }
  }
}