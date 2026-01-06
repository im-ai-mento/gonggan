import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SpaceFile, Message, MessageType } from "../types";

// Helper to safely get env variable without crashing in browser
const getEnvApiKey = () => {
    try {
        // @ts-ignore
        return typeof process !== 'undefined' ? process.env?.API_KEY : undefined;
    } catch (e) {
        return undefined;
    }
};

// Initialize key from storage or env
let currentApiKey = localStorage.getItem('gemini_api_key') || getEnvApiKey() || '';

export const setGeminiApiKey = (key: string) => {
  currentApiKey = key;
  localStorage.setItem('gemini_api_key', key);
};

export const getGeminiApiKey = () => currentApiKey;

// Define Safety Settings
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/**
 * Helper to build prompt parts (Shared between streaming and non-streaming)
 */
const buildPromptParts = (
  prompt: string,
  contextFiles: SpaceFile[],
  instructions: string,
  chatHistory: Message[],
  tempFiles: SpaceFile[]
): any[] => {
    const parts: any[] = [];

    // 1. Add Context Files (Persistent Project Files)
    if (contextFiles.length > 0) {
      parts.push({ text: "--- BEGIN PROJECT CONTEXT FILES ---" });
      for (const file of contextFiles) {
        if (file.base64Data && file.mimeType) {
          parts.push({
            inlineData: {
              data: file.base64Data,
              mimeType: file.mimeType
            }
          });
          parts.push({ text: `[File: ${file.name}]` });
        } else if (file.type === 'link') {
           parts.push({ text: `[Link: ${file.name}]` });
        }
      }
      parts.push({ text: "--- END PROJECT CONTEXT FILES ---" });
    }

    // 2. Add Temporary Files (Current Turn Attachments)
    if (tempFiles.length > 0) {
        parts.push({ text: "--- BEGIN CURRENT MESSAGE ATTACHMENTS ---" });
        for (const file of tempFiles) {
            if (file.base64Data && file.mimeType) {
                parts.push({
                    inlineData: {
                        data: file.base64Data,
                        mimeType: file.mimeType
                    }
                });
                parts.push({ text: `[Attached File: ${file.name}]` });
            }
        }
        parts.push({ text: "--- END ATTACHMENTS ---" });
    }

    // 3. Add Project Instructions
    if (instructions) {
      parts.push({ text: `[PROJECT INSTRUCTIONS]: ${instructions}` });
    }

    // 4. Add Conversation History
    if (chatHistory.length > 0) {
        parts.push({ text: "--- PREVIOUS CONVERSATION HISTORY ---" });
        const recentHistory = chatHistory.slice(-10); 
        for (const msg of recentHistory) {
            const role = msg.type === MessageType.USER ? "User" : "AI";
            if (msg.contentType === 'TEXT') {
                 parts.push({ text: `${role}: ${msg.content}` });
            } else if (msg.contentType === 'IMAGE') {
                 parts.push({ text: `${role}: [Generated an Image]` });
            }
        }
        parts.push({ text: "--- END HISTORY ---" });
    }

    // 5. Add User Query
    parts.push({ text: `User Query: ${prompt}` });

    return parts;
};

/**
 * Standard Text Generation (Non-streaming)
 */
export const generateTextResponse = async (
  prompt: string,
  contextFiles: SpaceFile[],
  instructions: string,
  webSearchEnabled: boolean = false,
  chatHistory: Message[] = [],
  tempFiles: SpaceFile[] = [],
  model: string = 'gemini-3-flash-preview' // Model parameter added
): Promise<string> => {
  if (!currentApiKey) return "API key is missing. Please set it in the top right menu.";

  try {
    const ai = new GoogleGenAI({ apiKey: currentApiKey });
    const parts = buildPromptParts(prompt, contextFiles, instructions, chatHistory, tempFiles);
    
    const tools: any[] = [];
    if (webSearchEnabled) tools.push({ googleSearch: {} });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model, 
      contents: { parts },
      config: {
        systemInstruction: "You are Gonggan Agent. Speak Korean. Answer naturally without using Markdown headers (###) or code blocks (```) unless specifically asked for code. Keep responses clean and conversational.",
        tools: tools,
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    let finalText = response.text || "No response generated.";
    finalText = finalText.replace(/\*\*/g, '');

    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const links = chunks
            .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
            .map((chunk: any) => `- [${chunk.web.title}](${chunk.web.uri})`)
            .join('\n');
        
        if (links) finalText += `\n\n출처:\n${links}`;
    }

    return finalText;
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};

/**
 * Streaming Text Generation
 */
export const streamTextResponse = async function* (
  prompt: string,
  contextFiles: SpaceFile[],
  instructions: string,
  webSearchEnabled: boolean = false,
  chatHistory: Message[] = [],
  tempFiles: SpaceFile[] = [],
  model: string = 'gemini-3-flash-preview' // Model parameter added
): AsyncGenerator<{ text: string; groundingMetadata?: any }, void, unknown> {
  if (!currentApiKey) {
      yield { text: "API key is missing. Please set it in the top right menu." };
      return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: currentApiKey });
    const parts = buildPromptParts(prompt, contextFiles, instructions, chatHistory, tempFiles);
    
    const tools: any[] = [];
    if (webSearchEnabled) tools.push({ googleSearch: {} });

    const responseStream = await ai.models.generateContentStream({
      model: model, 
      contents: { parts },
      config: {
        systemInstruction: "You are Gonggan Agent. Speak Korean. Answer naturally without using Markdown headers (###) or code blocks (```) unless specifically asked for code. Keep responses clean and conversational.",
        tools: tools,
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    for await (const chunk of responseStream) {
        const text = chunk.text || "";
        const cleanText = text.replace(/\*\*/g, '');
        
        const grounding = chunk.candidates?.[0]?.groundingMetadata;
        
        yield { text: cleanText, groundingMetadata: grounding };
    }

  } catch (error) {
    console.error("Gemini Stream Error:", error);
    yield { text: "\n[Error generating response]" };
  }
};

/**
 * Helper to ensure aspect ratio is supported
 */
const getValidAspectRatio = (ratio: string): string => {
    const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    if (validRatios.includes(ratio)) return ratio;
    
    // Fallback mappings for UI options that aren't natively supported
    if (ratio === '21:9') return '16:9';
    if (ratio === '5:4') return '4:3';
    if (ratio === '3:2') return '4:3';
    
    return '1:1'; // Default fallback
};

/**
 * Generates an image using Gemini models
 */
export const generateImageResponse = async (
    prompt: string, 
    aspectRatio: string = "1:1", 
    quality: string = "1K",
    model: string = 'gemini-3-pro-image-preview',
    referenceImages: { data: string, mimeType: string }[] = [] 
): Promise<string | null> => {
  if (!currentApiKey) {
      alert("API Key가 필요합니다. 우측 상단 열쇠 아이콘을 눌러 키를 입력해주세요.");
      return null;
  }
  
  const effectiveRatio = getValidAspectRatio(aspectRatio === 'Auto' ? '1:1' : aspectRatio);

  try {
    const ai = new GoogleGenAI({ apiKey: currentApiKey });
    const parts: any[] = [];

    for (const img of referenceImages) {
        parts.push({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType 
            }
        });
    }
    parts.push({ text: prompt });

    const imageConfig: any = {
        aspectRatio: effectiveRatio as any, 
    };

    if (model === 'gemini-3-pro-image-preview') {
        imageConfig.imageSize = quality as any;
    }

    const response = await ai.models.generateContent({
      model: model, 
      contents: {
        parts: parts
      },
      config: {
        imageConfig: imageConfig,
        safetySettings: SAFETY_SETTINGS
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    throw error;
  }
};