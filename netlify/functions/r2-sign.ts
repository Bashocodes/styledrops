import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Handler } from "@netlify/functions";

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

// Initialize R2 client using environment variables from Netlify
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

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
    const { contentType, ext, folder } = event.queryStringParameters as R2SignRequest;

    if (!contentType || !ext) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters: contentType and ext' }),
      };
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'
    ];

    if (!allowedTypes.includes(contentType)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Unsupported content type: ${contentType}` }),
      };
    }

    const key = `${folder || 'uploads'}/${makeUUID()}${ext}`;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_URL;

    if (!bucketName || !publicBaseUrl) {
      throw new Error('R2 environment variables not configured in Netlify');
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      ACL: "public-read",
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 minutes
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