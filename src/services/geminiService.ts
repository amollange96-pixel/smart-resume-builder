import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env
  ? (import.meta as any).env.VITE_GEMINI_API_KEY
  : process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
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
      const isOverload = error.status === 503 || error.message?.includes("503") || error.message?.includes("demand");
      const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests");

      if (isOverload || isRateLimit) {
        console.warn(`[Attempt ${attempt + 1}] Gemini API Limit Hit (429/503). Retrying in ${3000 * (attempt + 1)}ms...`);
        if (attempt === retries - 1) {
          throw new Error(isRateLimit 
            ? "Gemini API rate limit exceeded (15 requests/min). Please wait a few seconds and try again." 
            : "Gemini is currently experiencing extreme demand. Please wait a few minutes and try again.");
        }
        await delay(3000 * (attempt + 1)); // Exponential backoff: 3s, 6s, 9s
      } else {
        throw error; // Throw standard 400/404s immediately
      }
    }
  }
  throw new Error("Failed to generate content after retries.");
}

// ...
export async function analyzeResume(resumeBase64OrText: string, jobDescription: string, tier: 'free' | 'premium', isPdf: boolean): Promise<Partial<AnalysisResult>> {
  if (!apiKey) throw new Error("Gemini API Key is missing. Please add it to your environment variables.");

  const model = "gemini-2.5-flash";
  const hasJobDesc = jobDescription && jobDescription.trim().length > 0;
  
  const freePromptWithJD = `
    Analyze the provided resume against the target job description.
    Provide a basic structural ATS evaluation.
    
    Job Description:
    ${jobDescription}
    
    Return the analysis in JSON format with ONLY the following structure:
    {
      "score": number (0-100),
      "breakdown": {
        "skillsMatch": number (0-100),
        "experienceMatch": number (0-100),
        "keywordDensity": number (0-100),
        "formatting": number (0-100),
        "grammar": number (0-100)
      }
    }
  `;

  const freePromptWithoutJD = `
    Analyze the provided resume and perform a general resume critique.
    Since no job description is provided, analyze the overall structure, formatting, spelling, grammar, and general layout.
    Provide a basic structural evaluation.
    
    Return the analysis in JSON format with ONLY the following structure:
    {
      "score": number (0-100),
      "breakdown": {
        "skillsMatch": number (0-100), // Repurposed for general Skills Strength/Presentation quality
        "experienceMatch": number (0-100), // Repurposed for general Experience Presentation/Impact quality
        "keywordDensity": number (0-100), // Repurposed for overall Keyword Variety and Industry Terminology strength
        "formatting": number (0-100), // Formatting and layout quality
        "grammar": number (0-100) // Spelling, grammar, and professional tone quality
      }
    }
  `;

  const premiumPromptWithJD = `
    Analyze the provided resume against the target job description.
    Provide a detailed, deep-dive ATS (Applicant Tracking System) analysis, scoring, and actionable suggestions for improvement.
    
    Job Description:
    ${jobDescription}
    
    Return the analysis in JSON format with the following complete structure:
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
      "topCompanies": [
        {
          "name": string (Name of a top company hiring in this domain),
          "description": string (Brief description of what the company does),
          "whyMatch": string (Why this company is a good fit for the candidate's specific background),
          "url": string (The official website URL of the company)
        }
      ],
      "originalContent": string (the exact original text extracted from the uploaded resume, but cleanly formatted in Markdown without changing any of the original wording),
      "optimizedContent": string (a fully rewritten, highly optimized version of the resume content perfectly targeted to the job description, formatted using Markdown with standard resume sections like Professional Summary, Experience, Education, and Skills)
    }
  `;

  const premiumPromptWithoutJD = `
    Analyze the provided resume and perform a detailed, deep-dive resume critique.
    Since no job description is provided, analyze the overall structure, spelling, grammar, formatting, and impact of content.
    Provide actionable suggestions for improvement.
    
    Return the analysis in JSON format with the following complete structure:
    {
      "score": number (0-100),
      "breakdown": {
        "skillsMatch": number (0-100), // Repurposed for general Skills Strength/Presentation quality
        "experienceMatch": number (0-100), // Repurposed for general Experience Presentation/Impact quality
        "keywordDensity": number (0-100), // Repurposed for overall Keyword Variety and Industry Terminology strength
        "formatting": number (0-100), // Formatting and layout quality
        "grammar": number (0-100) // Spelling, grammar, and professional tone quality
      },
      "missingSkills": string[], // List important, standard skills typical of the candidate's industry/role that are missing from their resume
      "weaknesses": string[], // Identify specific areas of weakness in content, wording, or presentation (e.g., "lack of quantified achievements")
      "suggestions": string[], // Actionable tips on how to improve the resume generally
      "topCompanies": [
        {
          "name": string (Name of a top company hiring in candidate's field),
          "description": string (Brief description of what the company does),
          "whyMatch": string (Why this company aligns with the candidate's background),
          "url": string (The official website URL of the company)
        }
      ],
      "originalContent": string (the exact original text extracted from the uploaded resume, but cleanly formatted in Markdown without changing any of the original wording),
      "optimizedContent": string (a fully polished, rewritten, highly professional version of the resume content, improving formatting, structure, action verbs, and tone without changing the underlying truth of their experience, formatted using Markdown with standard resume sections like Professional Summary, Experience, Education, and Skills)
    }
  `;
  
  const prompt = tier === 'premium'
    ? (hasJobDesc ? premiumPromptWithJD : premiumPromptWithoutJD)
    : (hasJobDesc ? freePromptWithJD : freePromptWithoutJD);

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
          topCompanies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                whyMatch: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["name", "description", "whyMatch", "url"]
            }
          },
          originalContent: { type: Type.STRING },
          optimizedContent: { type: Type.STRING }
        },
        required: ["score", "breakdown", "missingSkills", "weaknesses", "suggestions", "topCompanies", "originalContent", "optimizedContent"]
      }
    };

    const contents = [{
      role: 'user',
      parts: isPdf ? [
        {
          inlineData: {
            data: resumeBase64OrText,
            mimeType: "application/pdf"
          }
        },
        { text: prompt }
      ] : [
        { text: `Resume Text Content:\n${resumeBase64OrText}` },
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
    throw new Error(error.message || "Unknown error");
  }
}

export async function generateCoverLetter(resumeContent: string, jobDescription: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const hasJobDesc = jobDescription && jobDescription.trim().length > 0;
  
  const prompt = hasJobDesc ? `
    Based on the following resume and job description, generate a professional and tailored cover letter.
    
    Resume Content:
    ${resumeContent}
    
    Job Description:
    ${jobDescription}
    
    The cover letter should be concise, highlight relevant skills and experiences, and demonstrate enthusiasm for the role.
  ` : `
    Based on the following resume, generate a professional, versatile speculative cover letter (letter of interest).
    Since no specific job description is provided, it should highlight the candidate's core strengths, major achievements, and professional value, leaving placeholders for company name and role where appropriate (e.g., [Company Name], [Job Title]).
    
    Resume Content:
    ${resumeContent}
    
    The letter should be compelling, concise, and structured professionally.
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

export async function fixGrammar(text: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are an expert copywriter and grammarian. Please review the following text.
    Correct any spelling and grammar mistakes. Enhance the professional tone and ensure it sounds action-oriented and impactful.
    DO NOT add any conversational filler. Return ONLY the fully corrected and improved text.
    
    Original Text:
    ${text}
  `;
  try {
    const contents = [{ parts: [{ text: prompt }] }];
    const response = await generateWithRetry(model, contents);
    return response.text || text;
  } catch (error) {
    console.error("Gemini Grammar Check Error:", error);
    throw error;
  }
}
