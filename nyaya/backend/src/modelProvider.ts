import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";

/**
 * Model Fallback Provider
 * 
 * Tries models in order:
 * 1. openai/gpt-oss-20b (Groq API - GROQ_API_KEY)
 * 2. llama-3.3-70b-versatile (Groq API - GROQ_API_KEY)  
 * 3. mistral-medium-3.5 (Mistral API - MISTRAL_API_KEY)
 */

// Model definitions
const MODEL_CHAIN = [
  {
    name: "openai/gpt-oss-20b",
    provider: "groq",
  },
  {
    name: "mistral-medium-3-5",
    provider: "mistral",
  },
  {
    name: "open-mistral-nemo",
    provider: "mistral",
  },
  {
    name: "ministral-8b-2512",
    provider: "mistral",
  },
  {
    name: "open-mistral-7b",
    provider: "mistral",
  },
  {
    name: "llama-3.3-70b-versatile",
    provider: "groq",
  },
];

function isRateLimitError(error: any): boolean {
  const message = (error?.message || "").toLowerCase();
  const status = error?.status || error?.response?.status;
  return (
    status === 429 ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("too many requests") ||
    message.includes("quota") ||
    message.includes("tokens per minute")
  );
}

/**
 * Creates an LLM instance for the given model config
 */
function createLLM(modelConfig: typeof MODEL_CHAIN[number], temperature: number = 0) {
  if (modelConfig.provider === "groq") {
    return new ChatGroq({
      model: modelConfig.name,
      temperature,
    });
  } else {
    // Mistral via OpenAI-compatible endpoint
    return new ChatOpenAI({
      modelName: modelConfig.name,
      temperature,
      apiKey: process.env.MISTRAL_API_KEY,
      configuration: {
        baseURL: "https://api.mistral.ai/v1",
      },
    });
  }
}

/**
 * Returns the primary LLM. Used as default for simple .pipe() chains.
 * Falls back automatically on rate limit via callWithFallback.
 */
export function getPrimaryLLM(temperature: number = 0) {
  return createLLM(MODEL_CHAIN[0], temperature);
}

/**
 * Returns an LLM at a specific fallback index (0 = primary, 1 = first fallback, etc.)
 */
export function getLLM(index: number = 0, temperature: number = 0) {
  const modelConfig = MODEL_CHAIN[Math.min(index, MODEL_CHAIN.length - 1)];
  return createLLM(modelConfig, temperature);
}

/**
 * Invokes a prompt chain with automatic fallback on rate-limit errors.
 * 
 * @param promptTemplate - A compiled ChatPromptTemplate
 * @param inputValues - The values to pass to the prompt
 * @param options - Optional: temperature, structured output schema
 * @returns The LLM response
 */
export async function callWithFallback(
  promptTemplate: any,
  inputValues: Record<string, any>,
  options: { temperature?: number; structuredSchema?: any; structuredName?: string } = {}
) {
  const { temperature = 0, structuredSchema, structuredName } = options;

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const modelConfig = MODEL_CHAIN[i];
    try {
      console.log(`  → Trying model: ${modelConfig.name} (${modelConfig.provider})`);
      
      let llm = createLLM(modelConfig, temperature);

      if (structuredSchema) {
        // For structured output, use withStructuredOutput
        const structuredLlm = llm.withStructuredOutput(structuredSchema, { 
          name: structuredName || "extract" 
        });
        
        if (promptTemplate) {
          const chain = promptTemplate.pipe(structuredLlm);
          const result = await chain.invoke(inputValues);
          return result;
        } else {
          // If no promptTemplate (e.g. fact extractor), inputValues are the raw messages
          const result = await structuredLlm.invoke(inputValues as any);
          return result;
        }
      } else {
        // Standard prompt → LLM chain
        const chain = promptTemplate.pipe(llm);
        const result = await chain.invoke(inputValues);
        return result;
      }
    } catch (error: any) {
      console.error(`  ✗ Model ${modelConfig.name} failed: ${error.message}`);
      
      if (isRateLimitError(error) && i < MODEL_CHAIN.length - 1) {
        console.log(`  ↻ Rate limit hit, falling back to next model...`);
        continue;
      }
      
      // If it's the last model or a non-rate-limit error, throw
      if (i === MODEL_CHAIN.length - 1) {
        throw error;
      }
      
      // For non-rate-limit errors, also try fallback (the model might just be down)
      console.log(`  ↻ Error occurred, trying next model...`);
      continue;
    }
  }

  throw new Error("All models failed");
}
