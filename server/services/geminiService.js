import { GoogleGenerativeAI } from '@google/generative-ai';

// Models confirmed available for the user's key
const MODEL_CANDIDATES = [
    'gemini-2.0-flash',        // Primary choice (fast, new)
    'gemini-flash-latest',     // Stable alias
    'gemini-pro-latest',       // Fallback pro
    'gemini-2.5-flash'         // Bleeding edge
];

export async function generateContent(prompt, apiKey) {
    if (!apiKey) {
        throw new Error("Gemini API Key is required.");
    }

    const cleanKey = apiKey.trim();
    // console.log(`[Gemini Service] Using Key: ${cleanKey.substring(0, 4)}...`);

    const genAI = new GoogleGenerativeAI(cleanKey);
    let lastError = null;

    // Iterate through candidates
    for (const modelName of MODEL_CANDIDATES) {
        try {
            // console.log(`[Gemini] Attempting generation with model: ${modelName}`); 
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            if (text) {
                console.log(`[Gemini] Success with ${modelName}`);
                return text;
            }
        } catch (err) {
            // console.warn(`[Gemini] Failed with ${modelName}: ${err.message}`);
            lastError = err;

            // If the error is strictly about the API Key, abort immediately
            if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
                throw new Error("Invalid Gemini API Key provided. Please check your key.");
            }
        }
    }

    // If loop finishes without return
    console.error(`[Gemini] All models failed. Last error: ${lastError?.message}`);
    throw new Error(`Failed to generate content using available models (${MODEL_CANDIDATES.join(', ')}). Valid API key required.`);
}
