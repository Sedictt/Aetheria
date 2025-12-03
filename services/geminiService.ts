import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeJournalEntry = async (text: string): Promise<AIAnalysisResult> => {
  if (!text || text.length < 10) {
    throw new Error("Entry too short to analyze");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this journal entry. Provide the following structured data:
      1. A single word mood describing the entry.
      2. A sentiment score from 0 (very negative/sad) to 10 (very positive/happy).
      3. A hex color code (soft, aesthetic, pastel preferred) that visually represents this mood.
      4. 3-5 relevant tags.
      5. A concise one-sentence summary.
      6. A deep, philosophical reflection question based on the content.
      
      Journal Entry:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING, description: "A single emotive word describing the entry" },
            moodScore: { type: Type.NUMBER, description: "Sentiment score 0-10" },
            moodColor: { type: Type.STRING, description: "Hex color code (e.g. #FFB6C1)" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3-5 short keywords" 
            },
            summary: { type: Type.STRING, description: "A concise one-sentence summary" },
            reflectionQuestion: { type: Type.STRING, description: "A thoughtful question for self-reflection based on the entry" }
          },
          required: ["mood", "moodScore", "moodColor", "tags", "summary", "reflectionQuestion"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const continueWriting = async (currentText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a helpful co-author. The user is writing a journal entry. Write the next 2-3 sentences continuing their train of thought. Match their tone, style, and perspective (first person). Do not repeat the last sentence.
      
      Current Text:
      ${currentText}`
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Continuation Error:", error);
    return "";
  }
};