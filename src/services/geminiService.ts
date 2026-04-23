import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Utility to pause execution
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Robust retry wrapper for Gemini Generation
async function generateWithRetry(model: string, contents: any[], config?: any, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const payload: any = {
        model: model,
        contents: contents
      };
      if (config) payload.config = config;

      return await ai.models.generateContent(payload);
    } catch (error: any) {
      if (error.status === 503 || error.message?.includes("503") || error.message?.includes("demand")) {
        console.warn(`[Attempt ${attempt + 1}] Gemini 503 Overload. Retrying in ${2000 * (attempt + 1)}ms...`);
        if (attempt === retries - 1) throw new Error("Gemini is currently experiencing extreme demand. Please wait a few minutes and try again.");
        await delay(2000 * (attempt + 1)); // Exponential backoff: 2s, 4s, 6s
      } else {
        throw error; // Throw standard 400/404s immediately
      }
    }
  }
  throw new Error("Failed to generate content after retries.");
}

// ...
export async function analyzeResume(resumeBase64: string, jobDescription: string): Promise<Partial<AnalysisResult>> {
  if (!apiKey) throw new Error("Gemini API Key is missing. Please add it to your environment variables.");

  const model = "gemini-2.5-flash";
  const prompt = `
    Analyze the attached PDF resume against the provided job description.
    Provide a detailed ATS (Applicant Tracking System) analysis, scoring, and suggestions for improvement.
    
    Job Description:
    ${jobDescription}
    
    Return the analysis in JSON format with the following structure:
    {
      "score": number (0-100),
      "breakdown": {
        "skillsMatch": number (0-100),
        "experienceMatch": number (0-100),
        "keywordDensity": number (0-100),
        "formatting": number (0-100),
        "grammar": number (0-100)
      },
      "missingSkills": string[],
      "weaknesses": string[],
      "suggestions": string[],
      "optimizedContent": string (a rewritten version of the resume content optimized for the job description)
    }
  `;

  try {
    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          breakdown: {
            type: Type.OBJECT,
            properties: {
              skillsMatch: { type: Type.NUMBER },
              experienceMatch: { type: Type.NUMBER },
              keywordDensity: { type: Type.NUMBER },
              formatting: { type: Type.NUMBER },
              grammar: { type: Type.NUMBER }
            },
            required: ["skillsMatch", "experienceMatch", "keywordDensity", "formatting", "grammar"]
          },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          optimizedContent: { type: Type.STRING }
        },
        required: ["score", "breakdown", "missingSkills", "weaknesses", "suggestions", "optimizedContent"]
      }
    };

    const contents = [{
      role: 'user',
      parts: [
        {
          inlineData: {
            data: resumeBase64,
            mimeType: "application/pdf"
          }
        },
        { text: prompt }
      ]
    }];

    const response = await generateWithRetry(model, contents, config);

    if (!response.text) throw new Error("Gemini returned an empty response.");

    let cleanText = response.text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message?.includes("quota")) throw new Error("Gemini API quota exceeded. Please try again later.");
    throw new Error(`AI Analysis failed: ${error.message || "Unknown error"}`);
  }
}

export async function generateCoverLetter(resumeContent: string, jobDescription: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const prompt = `
    Based on the following resume and job description, generate a professional and tailored cover letter.
    
    Resume Content:
    ${resumeContent}
    
    Job Description:
    ${jobDescription}
    
    The cover letter should be concise, highlight relevant skills and experiences, and demonstrate enthusiasm for the role.
  `;

  try {
    const contents = [{ parts: [{ text: prompt }] }];
    const response = await generateWithRetry(model, contents);
    return response.text || "";
  } catch (error) {
    console.error("Gemini Cover Letter Error:", error);
    throw error;
  }
}

export async function generateResume(prompt: string): Promise<string> {
  const model = "gemini-2.5-flash";
  try {
    const contents = [{ parts: [{ text: prompt }] }];
    const response = await generateWithRetry(model, contents);
    return response.text || "";
  } catch (error) {
    console.error("Gemini Resume Generation Error:", error);
    throw error;
  }
}
