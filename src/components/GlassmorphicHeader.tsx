import React, { useState } from 'react';
import { 
  Code, 
  // LogIn, 
  // LogOut, 
  // User, 
  // Loader2, 
  Menu, // Import Menu icon
  X, // Import X icon
  // AlertCircle,
  // Settings
} from 'lucide-react';
// import { useAuth } from '../hooks/useAuth';
import { addBreadcrumb, captureError } from '../lib/sentry';

interface GlassmorphicHeaderProps {
  onDecodeClick: () => void;
  onLogoClick?: () => void;
  // onProfileClick: () => void;
  // signInError: string | null;
  // onDismissSignInError: () => void;
}

export const GlassmorphicHeader: React.FC<GlassmorphicHeaderProps> = ({
  onDecodeClick,
  onLogoClick,
  // onProfileClick,
  // signInError,
  // onDismissSignInError
}) => {
  // const { user, loading, signInWithGoogle, signOut } = useAuth();
  // const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile menu
  
  // Removed authentication handlers

  const handleLogoClick = () => {
    addBreadcrumb('Logo clicked', 'ui');
    onLogoClick?.();
  };

  // Removed account handlers

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-to-main focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }
        }}
      >
        Skip to main content
      </a>

      {/* Removed error banner */}

      {/* Glassmorphic Header */}
      <header className="fixed left-1 right-1 z-40 top-1">
        <div className="bg-black/50 backdrop-blur-xl border border-black/50 rounded-full shadow-2xl h-14 flex items-center justify-between px-4 lg:px-6">
          {/* Left Section - Logo */}
          <div className="flex-1 flex items-center justify-start">
            <button
              onClick={handleLogoClick}
              className="hover:opacity-80 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
              aria-label="StyleDrop home"
              tabIndex={0}
            >
              <img 
                src="/Glowing Infinity in Frosted Glass copy copy.png" 
                alt="StyleDrop Logo" 
                className="h-7 w-auto object-contain"
                style={{ filter: 'brightness(1.2) contrast(1.1)' }}
              />
            </button>
          </div>

          {/* Hamburger Menu Button (visible on small screens) */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-full text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Open mobile menu"
              tabIndex={0}
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Desktop Navigation (hidden on small screens) */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            {/* Center Section - Decode Button */}
            <button
              onClick={() => {
                onDecodeClick();
                addBreadcrumb('Decode button clicked', 'ui');
              }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-2xl transition-colors font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 hover:bg-black/20 text-[#C78D4E] hover:text-[#D79D5E] cursor-pointer"
              aria-label="Decode media - analyze your images, videos, or audio"
              tabIndex={0}
            >
              <Code size={16} />
              <span className="hidden sm:block">
                Decode Media
              </span>
            </button>
          </div>

          {/* Removed desktop authentication section */}
          <div className="hidden lg:flex flex-1 items-center justify-end">
            {/* Empty space for balance */}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Close mobile menu"
              tabIndex={0}
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex flex-col items-center space-y-6">
            {/* Decode Button for Mobile */}
            <button
              onClick={() => {
                onDecodeClick();
                setIsMobileMenuOpen(false); // Close menu after click
                addBreadcrumb('Decode button clicked (mobile)', 'ui');
              }}
              className="flex items-center gap-3 px-6 py-3 rounded-full text-2xl font-mono tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 text-[#C78D4E] hover:text-[#D79D5E] hover:bg-white/10 cursor-pointer"
              aria-label="Decode media - analyze your images, videos, or audio"
              tabIndex={0}
            >
              <Code size={28} />
              <span>Decode Media</span>
            </button>
            
            {/* Removed mobile authentication */}
          </nav>
        </div>
      )}
    </>
  );
};