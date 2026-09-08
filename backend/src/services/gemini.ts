import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

export async function analyzeMedia(prompt: string, mediaData: Uint8Array, mimeType: string) {
  const ai = getGenAI();
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: Buffer.from(mediaData).toString("base64"), mimeType } },
            ],
          },
        ],
      });
      return response;
    } catch (err: unknown) {
      const isUnavailable = String(err).includes("503") || String(err).includes("UNAVAILABLE") || String(err).includes("RESOURCE_EXHAUSTED");
      if (isUnavailable) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("All candidate models currently unavailable for analyzeMedia.");
}

export async function generateContent(prompt: string) {
  const ai = getGenAI();
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return response;
    } catch (err: unknown) {
      const isUnavailable = String(err).includes("503") || String(err).includes("UNAVAILABLE") || String(err).includes("RESOURCE_EXHAUSTED");
      if (isUnavailable) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("All candidate models currently unavailable for generateContent.");
}
