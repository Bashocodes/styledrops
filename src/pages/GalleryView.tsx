@@ .. @@
 import { getPosts, getPostsByUserId, Post, validateAndFixMediaUrl } from '../lib/supabaseUtils';
 import { addBreadcrumb, captureError } from '../lib/sentry';
+import { DEFAULTS } from '../constants';

 interface GalleryViewProps {
@@ .. @@
       const offset = reset ? 0 : posts.length;
       
       // NEW: Use different fetch function based on whether we're viewing an artist's profile
       let result;
       if (artistId) {
-        result = await getPostsByUserId(artistId, sortOrder, 12, offset, selectedMediaType, searchQuery);
+        result = await getPostsByUserId(artistId, sortOrder, DEFAULTS.GALLERY_PAGE_SIZE, offset, selectedMediaType, searchQuery);
       } else {
-        result = await getPosts(sortOrder, 12, offset, selectedMediaType, searchQuery);
+        result = await getPosts(sortOrder, DEFAULTS.GALLERY_PAGE_SIZE, offset, selectedMediaType, searchQuery);
       }
       
       const { posts: newPosts, hasMore: moreAvailable } = result;
@@ .. @@
               const target = e.target as HTMLImageElement;
               target.style.display = 'none';
               // Show the fallback div
               const fallbackDiv = target.nextElementSibling as HTMLElement;
               if (fallbackDiv) {
                 fallbackDiv.style.display = 'flex';
               }
+              // Report media loading failure
+              captureError(new Error('Image failed to load'), {
+                context: 'GalleryView.renderMediaPreview',
+                postId: post.id,
+                mediaUrl: validatedUrl,
+                originalUrl: post.media_url
+              });
             }}
           />
@@ .. @@
                 const target = e.target as HTMLVideoElement;
                 target.style.display = 'none';
                 const fallbackDiv = target.nextElementSibling as HTMLElement;
                 if (fallbackDiv) {
                   fallbackDiv.style.display = 'flex';
                 }
+                // Report media loading failure
+                captureError(new Error('Video failed to load'), {
+                  context: 'GalleryView.renderMediaPreview',
+                  postId: post.id,
+                  mediaUrl: validatedUrl,
+                  originalUrl: post.media_url
+                });
               }}
             />