import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function runGeminiPrompt(prompt) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const models = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
  ];

  let lastError;

  for (const model of models) {
    try {
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model,
        temperature: 0.7,
        max_tokens: 1024,
      });

      return response.choices[0].message.content;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function getMaskedGeminiApiKey() {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    return "not-set";
  }

  return `***${apiKey.slice(-4)}`;
}
