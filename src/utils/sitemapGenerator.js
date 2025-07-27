/**
 * Sitemap Generator Utility
 * 
 * This utility can be used to dynamically generate sitemap.xml
 * based on actual data from your Supabase database.
 * 
 * Usage: Run this script during your build process or as a scheduled task
 * to keep your sitemap up-to-date with actual content.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client (you'll need to set these environment variables)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Using static sitemap.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate dynamic sitemap.xml based on database content
 */
async function generateSitemap() {
  try {
    console.log('Generating dynamic sitemap...');
    
    // Fetch unique styles from posts
    const { data: styles, error: stylesError } = await supabase
      .from('posts')
      .select('style')
      .order('created_at', { ascending: false });

    if (stylesError) {
      console.error('Error fetching styles:', stylesError);
      return;
    }

    // Get unique styles
    const uniqueStyles = [...new Set(styles?.map(post => post.style) || [])];
    
    // Fetch recent posts for individual analysis pages
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to most recent 100 posts

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return;
    }

    // Generate sitemap XML
    const baseUrl = 'https://styledrop.org';
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Gallery -->
  <url>
    <loc>${baseUrl}/gallery</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Decode Page -->
  <url>
    <loc>${baseUrl}/decode</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add style pages
    uniqueStyles.forEach(style => {
      const styleSlug = style.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      sitemapXml += `  
  <!-- Style: ${style} -->
  <url>
    <loc>${baseUrl}/style/${styleSlug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    });

    // Add individual analysis pages
    posts?.forEach(post => {
      const lastmod = post.updated_at || post.created_at;
      const formattedDate = new Date(lastmod).toISOString().split('T')[0];
      
      sitemapXml += `  
  <!-- Analysis: ${post.id} -->
  <url>
    <loc>${baseUrl}/analysis/${post.id}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    sitemapXml += `
</urlset>`;

    // Write sitemap to public directory
    const publicDir = path.join(process.cwd(), 'public');
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    
    fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
    
    console.log(`✅ Sitemap generated successfully with ${uniqueStyles.length} styles and ${posts?.length || 0} posts`);
    console.log(`📍 Sitemap saved to: ${sitemapPath}`);
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
generateSitemap();