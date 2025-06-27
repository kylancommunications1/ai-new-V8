export interface GeminiBlob {
    mimeType: string;
    data: string;
}

export interface GeminiContentPart {
    thought?: boolean;
    text?: string;
    inlineData?: GeminiBlob;
    functionCall?: {
        name: string;
        args: Record<string, any>;
    };
    functionResponse?: {
        name: string;
        response: any;
    };
}

export interface GeminiContent {
    parts: GeminiContentPart[];
    role?: string;
}

export interface BidiRequest {
    setup?: BidiGenerateContentSetup;
    realtimeInput?: BidiGenerateContentRealtimeInput;
    clientContent?: {
        turns: any;
        turnComplete?: boolean;
    };
}

export interface GeminiLiveClientOptions {
    server: GeminiServer;
    setup: BidiGenerateContentSetup;
    primaryModel?: string;
    fallbackModel?: string;
}

export interface GeminiServer {
    url?: string;
    apiKey?: string;
}

export interface BidiGenerateContentSetup {
    model: string;
    responseModalities: ('TEXT' | 'AUDIO')[];
    generationConfig?: {
        candidateCount?: number,
        maxOutputTokens?: number,
        temperature?: number,
        topP?: number,
        topK?: number,
        presencePenalty?: number,
        frequencyPenalty?: number,
        mediaResolution?: 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 'MEDIA_RESOLUTION_HIGH'
    };
    speechConfig?: {
        voiceConfig?: {
            prebuiltVoiceConfig?: {
                voiceName: string
            }
        },
        languageCode?: string
    };
    systemInstruction?: {
        parts: [{ text: string }]
    };
    tools?: FunctionDeclaration[]
    realtimeInputConfig?: {
        automaticActivityDetection?: {
            disabled?: boolean
            startOfSpeechSensitivity?: 'START_SENSITIVITY_LOW' | 'START_SENSITIVITY_MEDIUM' | 'START_SENSITIVITY_HIGH'
            endOfSpeechSensitivity?: 'END_SENSITIVITY_LOW' | 'END_SENSITIVITY_MEDIUM' | 'END_SENSITIVITY_HIGH'
            prefixPaddingMs?: number
            silenceDurationMs?: number
        }
    }
    inputAudioTranscription?: {}
    outputAudioTranscription?: {}
    enableAffectiveDialog?: boolean
    proactivity?: {
        proactiveAudio?: boolean
    }
}

export interface FunctionDeclaration {
    function_declarations: [{
        name: string
        description: string
        parameters: {
            type: 'object'
            properties: Record<string, any>
            required?: string[]
        }
    }]
}

export interface BidiGenerateContentRealtimeInput {
    mediaChunks?: GeminiBlob[];
    audio?: GeminiBlob;
    video?: GeminiBlob;
    // activityStart?: ActivityStart;
    // activityEnd?: ActivityEnd;
    audioStreamEnd?: boolean;
    text?: string;
}

export interface BidiGenerateContentServerContent {
    generationComplete?: boolean;
    turnComplete?: boolean;
    interrupted?: boolean;
    modelTurn?: GeminiContent;
    inputTranscription?: {
        text: string;
    };
    outputTranscription?: {
        text: string;
    };
    usageMetadata?: {
        totalTokenCount: number;
        responseTokensDetails: any[];
    };
}

export interface BidiGenerateContentSetupComplete { }

export interface BidiGenerateContentServerMessage {
    setupComplete?: BidiGenerateContentSetupComplete;
    serverContent?: BidiGenerateContentServerContent;
}