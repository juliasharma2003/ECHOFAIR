
import { GoogleGenAI, Type } from "@google/genai";
import { Playlist, AnalysisResult, ArtistFinancials } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to wrap API calls with exponential backoff retries for 429 errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota");
      
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`Rate limit hit. Retrying in ${delay}ms (Attempt ${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error("Maximum retries exceeded");
}

export async function analyzePlaylistIntegrity(playlist: Playlist): Promise<AnalysisResult> {
  const trackData = playlist.tracks.map(t => `${t.title} by ${t.artist} (Label: ${t.label})`).join('\n');
  
  const prompt = `
    Act as a senior Music Industry Analyst specializing in anti-trust and organic discovery. 
    Inspect the following playlist for promotional patterns like "Payola" (repetitive placement of specific labels) and "Nepotism" (favoring artists from same parent corporations).

    Playlist Name: ${playlist.name}
    Owner: ${playlist.owner}
    Tracks:
    ${trackData}

    SCORING RULES:
    - 90-100: Excellent. High label variety, majority independent artists, no repetitive loops.
    - 70-89: Good. Mostly diverse, but has some major label concentration.
    - 50-69: Warning. Clearly dominated by 1 or 2 major labels; limited discovery for independent artists.
    - Below 50: High Risk. Patterns suggest industrial loops, repetitive label placements, or corporate-only selections.
    
    IMPORTANT: If your analysis/summary is critical of the playlist's diversity or mentions industrial loops, the score MUST be low (Below 60). Never give a high score (90+) to a playlist you describe as bad or unfair.
    
    Provide a JSON response with:
    - score (number 0-100)
    - summary (detailed string explaining the fairness or lack thereof)
    - riskFactors (array of objects with category, severity [Low/Medium/High], and description)
  `;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              riskFactors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["score", "summary", "riskFactors"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    });
  } catch (error) {
    console.error("Inspection failed after retries:", error);
    return { 
      score: 0, 
      summary: "Inspection failed due to network saturation or quota limits. Please try again in a moment.", 
      riskFactors: [{ category: 'Label Dominance', severity: 'High', description: 'System currently overwhelmed by requests.' }] 
    };
  }
}

export async function estimateArtistFinancials(artistName: string, label: string): Promise<ArtistFinancials> {
  const prompt = `
    Analyze the financial reality for the artist "${artistName}" (Label: ${label}). 
    Estimate:
    1. Monthly earnings from ~100k streams (standard mid-tier).
    2. The cut taken by streaming platforms (30%) and labels (varies).
    3. Find or suggest likely donation/support platforms (Bandcamp, Patreon, Ko-fi, or Linktree).
    
    Return a JSON response.
  `;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              estimatedMonthlyEarnings: { type: Type.NUMBER },
              platformCut: { type: Type.NUMBER },
              labelCut: { type: Type.NUMBER },
              artistTakeHome: { type: Type.NUMBER },
              supportLinks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platform: { type: Type.STRING },
                    url: { type: Type.STRING }
                  }
                }
              },
              fairnessStatement: { type: Type.STRING }
            },
            required: ["name", "estimatedMonthlyEarnings", "platformCut", "labelCut", "artistTakeHome", "supportLinks", "fairnessStatement"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    });
  } catch (error) {
    return {
      name: artistName,
      estimatedMonthlyEarnings: 0,
      platformCut: 0,
      labelCut: 0,
      artistTakeHome: 0,
      supportLinks: [],
      fairnessStatement: "Unable to retrieve financial estimates at this time."
    };
  }
}
