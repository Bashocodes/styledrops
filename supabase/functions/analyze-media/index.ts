/*
  # Gemini 2.5 Flash Media Analysis Edge Function

  This function analyzes media files using Google's Gemini 2.5 Flash model.
  It accepts base64-encoded media data and returns structured analysis results.
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface AnalysisRequest {
  mediaData: string;
  mimeType: string;
  mediaType: 'image' | 'video' | 'audio';
}

interface GeminiAnalysisResult {
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
const extractGeminiJSON = (responseText: string): GeminiAnalysisResult => {
  console.log('SERVER: Starting Gemini JSON extraction', {
    textLength: responseText.length,
    textPreview: responseText.substring(0, 100),
    hasCodeBlockStart: responseText.includes('```json'),
    hasCodeBlockEnd: responseText.includes('```'),
    startsWithBrace: responseText.trim().startsWith('{'),
    endsWithBrace: responseText.trim().endsWith('}')
  });

  let cleanedText = responseText.trim();
  
  try {
    // Strategy 1: Try parsing as-is first (in case it's already clean JSON)
    if (cleanedText.startsWith('{') && cleanedText.endsWith('}')) {
      const result = JSON.parse(cleanedText);
      console.log('SERVER: Direct JSON parse successful');
      return validateGeminiResult(result);
    }
  } catch (directParseError) {
    console.log('SERVER: Direct parse failed, attempting cleaning', {
      error: directParseError instanceof Error ? directParseError.message : 'Unknown error'
    });
  }

  // Strategy 2: Comprehensive text cleaning
  try {
    console.log('SERVER: Starting comprehensive text cleaning');
    
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
      console.log('SERVER: JSON object extracted using regex');
    }

    // Strategy 4: Find first { and last } to extract core JSON
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      console.log('SERVER: JSON boundaries identified and extracted');
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

    console.log('SERVER: Text cleaning completed', {
      cleanedLength: cleanedText.length,
      cleanedStart: cleanedText.substring(0, 100),
      startsWithBrace: cleanedText.startsWith('{'),
      endsWithBrace: cleanedText.endsWith('}')
    });

    const result = JSON.parse(cleanedText);
    console.log('SERVER: Cleaned JSON parse successful');
    return validateGeminiResult(result);

  } catch (cleanParseError) {
    console.error('SERVER: All parsing strategies failed', {
      cleanError: cleanParseError instanceof Error ? cleanParseError.message : 'Unknown error',
      originalText: responseText.substring(0, 500),
      cleanedText: cleanedText.substring(0, 500)
    });
    
    throw new Error(`Failed to parse Gemini response: ${cleanParseError instanceof Error ? cleanParseError.message : 'Unknown parsing error'}`);
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

  // CRITICAL: Validate keyTokens array has exactly 7 elements
  if (result.keyTokens.length !== 7) {
    console.warn('SERVER: keyTokens validation failed', {
      expected: 7,
      actual: result.keyTokens.length,
      tokens: result.keyTokens
    });
    
    // Fix the keyTokens array to have exactly 7 elements
    if (result.keyTokens.length > 7) {
      // If more than 7, take the first 7
      result.keyTokens = result.keyTokens.slice(0, 7);
    } else {
      // If less than 7, pad with generic tokens
      const fallbackTokens = [
        'visual style', 'color palette', 'artistic mood', 'creative essence', 
        'design elements', 'aesthetic tone', 'artistic vision'
      ];
      
      while (result.keyTokens.length < 7) {
        const missingIndex = result.keyTokens.length;
        result.keyTokens.push(fallbackTokens[missingIndex] || `token ${missingIndex + 1}`);
      }
    }
  }

  console.log('SERVER: Gemini result validation successful', {
    title: result.title,
    style: result.style,
    keyTokensCount: result.keyTokens.length,
    keyTokens: result.keyTokens
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('SERVER: Request received', {
      method: req.method,
      url: req.url,
      contentType: req.headers.get('Content-Type'),
      timestamp: new Date().toISOString()
    });

    // Parse JSON body with error handling
    let requestData: AnalysisRequest;
    try {
      requestData = await req.json();
      console.log('SERVER: JSON parsing successful', {
        hasMediaData: !!requestData.mediaData,
        mediaDataLength: requestData.mediaData?.length || 0,
        mimeType: requestData.mimeType,
        mediaType: requestData.mediaType
      });
    } catch (jsonError) {
      console.error('SERVER: JSON parsing failed:', jsonError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse request JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { mediaData, mimeType, mediaType } = requestData;

    // Validate required parameters
    const missingParams = [];
    if (!mediaData) missingParams.push('mediaData');
    if (!mimeType) missingParams.push('mimeType');
    if (!mediaType) missingParams.push('mediaType');

    if (missingParams.length > 0) {
      const errorMsg = `Missing required parameters: ${missingParams.join(', ')}`;
      console.error('SERVER: Validation failed:', errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('SERVER: GEMINI_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API key not configured',
          details: 'Please set GEMINI_API_KEY in your environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('SERVER: Gemini API key found, proceeding with analysis');

    // SIMPLIFIED: Construct the analysis prompt with relaxed requirements for dialogue prompts
    const analysisPrompt = `Analyze this ${mediaType} and return ONLY a valid JSON object with the following exact structure. Do not include any markdown formatting, code blocks, or additional text:

{
  "title": "2 word creative title",
  "style": "3 word creative description",
  "prompt": "Complete description of the scene in exactly 33 words",
  "keyTokens": ["token1","token2","token3","token4","token5","token6","token7"],
  "creativeRemixes": ["enhanced_remix1_15_to_21_words","enhanced_remix2_15_to_21_words","enhanced_remix3_15_to_21_words"],
  "outpaintingPrompts": ["enhanced_outpainting1_15_to_21_words","enhanced_outpainting2_15_to_21_words","enhanced_outpainting3_15_to_21_words"],
  "animationPrompts": ["enhanced_video1_15_to_21_words_5s_max","enhanced_video2_15_to_21_words_5s_max","enhanced_video3_15_to_21_words_5s_max"],
  "musicPrompts": ["enhanced_music1_150_to_180_characters","enhanced_music2_150_to_180_characters","enhanced_music3_150_to_180_characters"],
  "dialoguePrompts": ["dialogue1_5_to_10_words","dialogue2_5_to_10_words","dialogue3_5_to_10_words"],
  "storyPrompts": ["enhanced_story1_15_to_21_words","enhanced_story2_15_to_21_words","enhanced_story3_15_to_21_words"]
}

REQUIREMENTS:
- title: Exactly 2 words that capture the essence
- style: Exactly 3 words describing the aesthetic
- prompt: Exactly 33 words describing the complete scene
- keyTokens: EXACTLY 7 two-word tokens that best summarize the content (no more, no less)
- creativeRemixes: 3 creative reinterpretations, each 15-21 words
- outpaintingPrompts: 3 scene expansion prompts, each 15-21 words
- animationPrompts: 3 video animation descriptions, each 15-21 words, max 5 seconds
- musicPrompts: 3 music style descriptions, each 150-180 characters
- dialoguePrompts: 3 dialogue/narration prompts, each 5-10 words (simple and flexible)
- storyPrompts: 3 unique story concepts, each 15-21 words

CRITICAL: The keyTokens array MUST contain exactly 7 elements. Each element should be a meaningful two-word phrase that captures key aspects of the ${mediaType}. Return ONLY the JSON object above. No markdown, no code blocks, no additional text. Start with { and end with }.`;

    // Prepare the request to Gemini API
    const geminiRequest = {
      contents: [
        {
          parts: [
            {
              text: analysisPrompt
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: mediaData
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    console.log('SERVER: Calling Gemini API');

    // Call Gemini 2.5 Flash API with error handling
    let geminiResponse;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geminiRequest)
        }
      );
    } catch (fetchError) {
      console.error('SERVER: Gemini API fetch failed:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to Gemini API',
          details: fetchError instanceof Error ? fetchError.message : 'Network error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('SERVER: Gemini API response received', {
      status: geminiResponse.status,
      statusText: geminiResponse.statusText,
      ok: geminiResponse.ok
    });

    if (!geminiResponse.ok) {
      let errorText;
      try {
        errorText = await geminiResponse.text();
      } catch {
        errorText = 'Unable to read error response';
      }
      console.error('SERVER: Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API request failed',
          details: `Status ${geminiResponse.status}: ${errorText}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse Gemini response with error handling
    let geminiData;
    try {
      geminiData = await geminiResponse.json();
    } catch (parseError) {
      console.error('SERVER: Failed to parse Gemini response JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON response from Gemini API',
          details: parseError instanceof Error ? parseError.message : 'JSON parse error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('SERVER: Gemini response parsed', {
      hasCandidates: !!geminiData.candidates,
      candidatesLength: geminiData.candidates?.length || 0,
      firstCandidateHasContent: !!(geminiData.candidates?.[0]?.content)
    });
    
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      console.error('SERVER: Invalid Gemini response structure:', geminiData);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response structure from Gemini API',
          details: 'Missing candidates or content in response'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract the analysis text from Gemini response
    const analysisText = geminiData.candidates[0].content.parts[0].text;
    
    console.log('SERVER: Analysis text extracted', {
      textLength: analysisText.length,
      textPreview: analysisText.substring(0, 200) + '...'
    });
    
    // Parse the analysis result using robust JSON extraction
    let analysisResult;
    try {
      analysisResult = extractGeminiJSON(analysisText);
      console.log('SERVER: Analysis result parsed and validated successfully', {
        keyTokensCount: analysisResult.keyTokens.length,
        keyTokens: analysisResult.keyTokens
      });
    } catch (parseError) {
      console.error('SERVER: Failed to parse/validate analysis result:', parseError);
      console.error('SERVER: Raw Gemini response text:', analysisText); // ENHANCED: Include raw response in error log
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse analysis result',
          details: parseError instanceof Error ? parseError.message : 'Parse error',
          responsePreview: analysisText.substring(0, 500) + '...'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the successful analysis
    console.log('SERVER: Returning successful response');
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisResult,
        mediaType 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('SERVER: Unexpected edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});