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

// --- Code Quality Suggestions ---
// 1. Initialize the client once and reuse it.
// 2. The API key check is moved here, so it fails early if not configured.
if (!env.geminiApiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not configured.");
}

const genAI = new GoogleGenAI({ apiKey: env.geminiApiKey });
const MODEL = "gemini-3.5-flash";

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
  
  const result = await genAI.interactions.create({
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