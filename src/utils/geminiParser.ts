/**
 * Robust Gemini response parsing utilities
 */

import { addBreadcrumb, captureError } from '../lib/sentry';

export interface GeminiAnalysisResult {
  title: string;
  style: string;
  prompt: string;
  keyTokens: string[];
  creativeRemixes: string[];
  outpaintingPrompts: string[];
  animationPrompts: string[];
  musicPrompts: string[];
  dialoguePrompts: string[];
  storyPrompts: string[];
}

/**
 * Extract and parse JSON from Gemini response text
 * Handles markdown code blocks, backticks, and other formatting artifacts
 */
export const extractGeminiJSON = (responseText: string): GeminiAnalysisResult => {
  addBreadcrumb('Starting Gemini JSON extraction', 'parsing', {
    textLength: responseText.length,
    textPreview: responseText.substring(0, 100)
  });

  let cleanedText = responseText.trim();
  
  try {
    // Strategy 1: Try parsing as-is first (in case it's already clean JSON)
    if (cleanedText.startsWith('{') && cleanedText.endsWith('}')) {
      const result = JSON.parse(cleanedText);
      addBreadcrumb('Direct JSON parse successful', 'parsing');
      return validateGeminiResult(result);
    }
  } catch (directParseError) {
    addBreadcrumb('Direct parse failed, attempting cleaning', 'parsing', {
      error: directParseError instanceof Error ? directParseError.message : 'Unknown error'
    });
  }

  // Strategy 2: Comprehensive text cleaning
  try {
    // Remove all possible markdown code block variations
    cleanedText = cleanedText
      // Remove opening code blocks (case insensitive, with optional whitespace)
      .replace(/^```\s*(?:json|JSON)?\s*\n?/gi, '')
      // Remove closing code blocks
      .replace(/\n?\s*```\s*$/gi, '')
      // Remove any remaining backticks at start/end
      .replace(/^`+|`+$/g, '')
      // Remove any leading/trailing whitespace
      .trim();

    // Strategy 3: Extract JSON object using regex
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    // Strategy 4: Find first { and last } to extract core JSON
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    // Strategy 5: Clean up common JSON formatting issues
    cleanedText = cleanedText
      // Remove trailing commas before closing brackets/braces
      .replace(/,(\s*[}\]])/g, '$1')
      // Replace smart quotes with regular quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Ensure proper quote escaping
      .replace(/([^\\])"/g, '$1"');

    const result = JSON.parse(cleanedText);
    addBreadcrumb('Cleaned JSON parse successful', 'parsing');
    return validateGeminiResult(result);

  } catch (cleanParseError) {
    const error = new Error(`Failed to parse Gemini response: ${cleanParseError instanceof Error ? cleanParseError.message : 'Unknown parsing error'}`);
    captureError(error, {
      context: 'extractGeminiJSON',
      originalText: responseText.substring(0, 500),
      cleanedText: cleanedText.substring(0, 500)
    });
    throw error;
  }
};

/**
 * Validate that the parsed result has the expected structure
 */
const validateGeminiResult = (result: any): GeminiAnalysisResult => {
  const requiredFields = [
    'title', 'style', 'prompt', 'keyTokens', 
    'creativeRemixes', 'outpaintingPrompts', 'animationPrompts',
    'musicPrompts', 'dialoguePrompts', 'storyPrompts'
  ];

  const missingFields = requiredFields.filter(field => !result[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in Gemini response: ${missingFields.join(', ')}`);
  }

  // Validate array fields
  const arrayFields = [
    'keyTokens', 'creativeRemixes', 'outpaintingPrompts', 
    'animationPrompts', 'musicPrompts', 'dialoguePrompts', 'storyPrompts'
  ];

  for (const field of arrayFields) {
    if (!Array.isArray(result[field])) {
      throw new Error(`Field '${field}' must be an array`);
    }
  }

  // Validate string fields
  const stringFields = ['title', 'style', 'prompt'];
  for (const field of stringFields) {
    if (typeof result[field] !== 'string' || result[field].trim() === '') {
      throw new Error(`Field '${field}' must be a non-empty string`);
    }
  }

  addBreadcrumb('Gemini result validation successful', 'parsing', {
    title: result.title,
    style: result.style,
    keyTokensCount: result.keyTokens.length
  });

  return {
    title: result.title.trim(),
    style: result.style.trim(),
    prompt: result.prompt.trim(),
    keyTokens: result.keyTokens.map((token: string) => token.trim()),
    creativeRemixes: result.creativeRemixes.map((remix: string) => remix.trim()),
    outpaintingPrompts: result.outpaintingPrompts.map((prompt: string) => prompt.trim()),
    animationPrompts: result.animationPrompts.map((prompt: string) => prompt.trim()),
    musicPrompts: result.musicPrompts.map((prompt: string) => prompt.trim()),
    dialoguePrompts: result.dialoguePrompts.map((prompt: string) => prompt.trim()),
    storyPrompts: result.storyPrompts.map((prompt: string) => prompt.trim())
  };
};