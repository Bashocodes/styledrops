import React from 'react';

interface GallerySkeletonLoaderProps {
  count?: number;
}

export const GallerySkeletonLoader: React.FC<GallerySkeletonLoaderProps> = ({ count = 12 }) => {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6" role="grid" aria-label="Loading gallery content">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative break-inside-avoid animate-pulse"
          role="gridcell"
          aria-label="Loading content"
        >
          {/* Media Skeleton */}
          <div className="relative w-full aspect-square bg-gradient-to-br from-gray-700/50 to-gray-600/50">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            
            {/* Media type indicator skeleton */}
            <div className="absolute top-2 left-2 w-6 h-6 bg-gray-600/50 rounded-full" />
          </div>
          
          {/* Style name skeleton */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/80 px-3 py-2 rounded-t-lg">
            <div className="w-16 h-3 bg-gray-600/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const GalleryLoadMoreSkeleton: React.FC = () => {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 mt-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`loadmore-${index}`}
          className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative break-inside-avoid animate-pulse opacity-60"
        >
          {/* Media Skeleton */}
          <div className="relative w-full aspect-square bg-gradient-to-br from-gray-700/30 to-gray-600/30">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          </div>
          
          {/* Style name skeleton */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/60 px-3 py-2 rounded-t-lg">
            <div className="w-12 h-2 bg-gray-600/30 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};