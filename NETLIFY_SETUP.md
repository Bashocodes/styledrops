# Netlify Environment Variables Setup

Your site is deployed but needs environment variables to work properly. Follow these steps:

## 1. Go to Netlify Dashboard
- Visit https://app.netlify.com/
- Find your "styledrop" site
- Click on it to open the site dashboard

## 2. Navigate to Environment Variables
- Click on "Site settings" 
- In the left sidebar, click "Environment variables"
- Click "Add a variable" for each of the following:

## 3. Required Environment Variables

### Supabase Configuration (REQUIRED)
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Cloudflare R2 Configuration (for file uploads)
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

### Gemini API (for AI analysis)
```
GEMINI_API_KEY=your_gemini_api_key
```

### Optional - Sentry (for error tracking)
```
VITE_SENTRY_DSN=your_sentry_dsn
VITE_APP_ENV=production
```

## 4. Get Your Supabase Credentials
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL (for VITE_SUPABASE_URL)
   - anon/public key (for VITE_SUPABASE_ANON_KEY)

## 5. After Adding Variables
1. Click "Save" after adding each variable
2. Go back to "Deploys" tab
3. Click "Trigger deploy" → "Deploy site"
4. Wait for deployment to complete (usually 1-2 minutes)

## 6. Test Your Site
Once deployment is complete, visit https://styledrop.org again. The site should now load properly without the "Loading StyleLabs..." message.

## Minimum Required Setup
If you want to get the site working quickly, you only need:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

The other features (file uploads, AI analysis) will be disabled but the basic site will work.