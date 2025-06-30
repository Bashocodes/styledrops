# StyleLabs Environment Setup Guide

Your site is deployed but needs environment variables to function properly. Follow these steps to complete the setup:

## 🚨 Critical: Required Environment Variables

### 1. Supabase Configuration (REQUIRED)
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Gemini AI Configuration (REQUIRED for analysis)
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Cloudflare R2 Configuration (REQUIRED for file uploads)
```
VITE_R2_ACCESS_KEY=your_r2_access_key
VITE_R2_SECRET_KEY=your_r2_secret_key
VITE_R2_BUCKET_NAME=stylelabs-media
VITE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
VITE_R2_PUBLIC_URL=https://cdn.stylelabs.com/

R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_BUCKET_NAME=stylelabs-media
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.stylelabs.com/
```

## 📋 Step-by-Step Setup

### Step 1: Get Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (for `VITE_SUPABASE_URL`)
   - **anon/public key** (for `VITE_SUPABASE_ANON_KEY`)

### Step 2: Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key (for `GEMINI_API_KEY`)

### Step 3: Set Up Cloudflare R2 (Optional but recommended)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Create a bucket named `stylelabs-media`
4. Go to **Manage R2 API tokens**
5. Create a new token with R2 permissions
6. Copy the credentials

### Step 4: Add Variables to Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Find your **styledrop** site
3. Click **Site settings**
4. Go to **Environment variables**
5. Click **Add a variable** for each required variable above
6. **Important:** Click **Save** after adding each variable

### Step 5: Redeploy
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (1-2 minutes)

## 🔧 Minimum Setup for Testing
If you want to test quickly, you only need:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## ✅ Verification
After setup, visit https://styledrop.org and:
1. Sign in with Google should work
2. Upload and decode should work without errors
3. No "Setup Required" warnings should appear

## 🆘 Troubleshooting
- **"Environment not configured"**: Missing Supabase variables
- **"Edge Function returned non-2xx status"**: Missing Gemini API key
- **"Analysis service unavailable"**: Check Gemini API key is valid
- **File upload errors**: Missing R2 configuration

## 📞 Need Help?
If you encounter issues, check the browser console for specific error messages and ensure all environment variables are correctly set in Netlify.