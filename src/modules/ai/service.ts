import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

interface Review {
  comment: string;
  rating: number;
}

interface Business {
  name: string;
  category: string;
}

interface GenerateReviewResponseDto {
  review: Review;
  business: Business;
  tone: "professional" | "friendly" | "casual";
  language: string;
}

const MODEL = "gemini-3.5-flash";

let genAI: GoogleGenAI | null = null;

/**
 * Built on first use rather than at import time. A missing GEMINI_API_KEY is a
 * reason for this one endpoint to fail, not for the whole server to refuse to
 * boot - auth, payments and reviews do not need it. `env.geminiApiKey` is
 * optional by design, so throwing at module scope took the process down.
 *
 * The client is still created once and reused.
 */
const getClient = (): GoogleGenAI => {
  if (!env.geminiApiKey) {
    const err = new Error(
      "AI replies are not configured on this server. Set GEMINI_API_KEY.",
    );
    (err as any).statusCode = 503;
    throw err;
  }

  genAI ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return genAI;
};

const generateReviewResponse = async (
  dto: GenerateReviewResponseDto,
): Promise<{ response: string }> => {
  const { review, business, tone, language } = dto;

  if (!review?.comment || !review?.rating) {
    const err = new Error("Review comment and rating are required.");
    (err as any).statusCode = 400;
    throw err;
  }
  
  // 3. Refined prompt for better clarity and instruction.
  const prompt = `You are a customer service representative for "${business.name}", a business in the "${business.category}" industry.
  Your task is to generate a response to a customer review.
  
  **Instructions:**
  - Adopt a ${tone} tone.
  - Write the response in ${language}.
  - Keep the response concise and professional.
  - Naturally incorporate the customer's feedback.
  - Do not make promises you cannot keep.
  
  **Customer Review:**
  - Rating: ${review.rating}/5
  - Comment: "${review.comment}"
  
  **Your Response:**`;
  
  const result = await getClient().interactions.create({
    model: MODEL,
    input: prompt,
  });
  const text = result.output_text ?? "";

  return {
    response: text,
  };
};

export default {
  generateReviewResponse,
};