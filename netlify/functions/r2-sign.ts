import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Handler } from "@netlify/functions";
import { R2_FOLDERS, ALLOWED_MEDIA_TYPES, DEFAULTS } from "../../src/constants/index";
// Import constants (Note: In Node.js environment, we need to define these locally or import from a shared location)
const R2_FOLDERS = {
  UPLOADS: 'uploads',
  POSTS: 'posts', 
  THUMBNAILS: 'thumbnails'
} as const;

const ALLOWED_MEDIA_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'
] as const;

const DEFAULTS = {
  PRESIGNED_URL_EXPIRY_SECONDS: 300
} as const;

// UUID generation utility for Netlify functions
const makeUUID = (): string => {
  // In Node.js environment, crypto should be available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback polyfill for UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface R2SignRequest {
  contentType: string;
  ext: string;
  folder?: string;
}

export const handler: Handler = async (event) => {
  // Enhanced CORS headers to allow requests from the deployed domain
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "false"
  };

  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Validate all required environment variables first
    const requiredEnvVars = {
      R2_ACCESS_KEY: process.env.R2_ACCESS_KEY,
      R2_SECRET_KEY: process.env.R2_SECRET_KEY,
      R2_ENDPOINT: process.env.R2_ENDPOINT,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingVars.length > 0) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Missing required environment variables: ${missingVars.join(', ')}. Please configure these in your Netlify dashboard.` 
        }),
      };
    }

    // Initialize R2 client only after environment validation
    const r2Client = new S3Client({
      region: "auto",
      endpoint: requiredEnvVars.R2_ENDPOINT,
      credentials: {
        accessKeyId: requiredEnvVars.R2_ACCESS_KEY!,
        secretAccessKey: requiredEnvVars.R2_SECRET_KEY!,
      },
    });

    const { contentType, ext, folder } = event.queryStringParameters as R2SignRequest;

    if (!contentType || !ext) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters: contentType and ext' }),
      };
    }


    if (!ALLOWED_MEDIA_TYPES.includes(contentType as any)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Unsupported content type: ${contentType}` }),
      };
    }

    const key = `${folder || R2_FOLDERS.UPLOADS}/${makeUUID()}${ext}`;
    const bucketName = requiredEnvVars.R2_BUCKET_NAME;
    const publicBaseUrl = requiredEnvVars.R2_PUBLIC_URL;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      ACL: "public-read",
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: DEFAULTS.PRESIGNED_URL_EXPIRY_SECONDS });
    const publicUrl = `${publicBaseUrl}${key}`;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ uploadUrl, publicUrl, key }),
    };
  } catch (error: any) {
    console.error("R2 sign function error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};