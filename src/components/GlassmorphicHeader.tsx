import React, { useState } from 'react';
import { 
  Code, 
  LogIn, 
  LogOut, 
  User, 
  Loader2,
  AlertCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { addBreadcrumb, captureError } from '../lib/sentry';

interface GlassmorphicHeaderProps {
  onDecodeClick: () => void;
  onLogoClick?: () => void;
  onProfileClick: () => void;
  signInError: string | null;
  onDismissSignInError: () => void;
}

export const GlassmorphicHeader: React.FC<GlassmorphicHeaderProps> = ({
  onDecodeClick,
  onLogoClick,
  onProfileClick,
  signInError,
  onDismissSignInError
}) => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      addBreadcrumb('User clicked Google sign in button', 'ui');
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in failed:', error);
      captureError(error, { 
        context: 'handleGoogleSignIn',
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  };

  const handleSignOut = async () => {
    try {
      addBreadcrumb('User clicked sign out button', 'ui');
      await signOut();
      setShowProfileMenu(false);
    } catch (error) {
      console.error('Sign out failed:', error);
      captureError(error as Error, { context: 'handleSignOut' });
    }
  };

  const handleLogoClick = () => {
    addBreadcrumb('Logo clicked', 'ui');
    onLogoClick?.();
  };

  const handleAccountClick = () => {
    addBreadcrumb('Account settings clicked', 'ui');
    setShowProfileMenu(false);
    onProfileClick();
  };

  // Get display name with priority: username > full_name > email prefix
  const getDisplayName = () => {
    if (!user) return 'User';
    return user.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  };

  return (
    <>
      {/* Error Banner */}
      {signInError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/10 border-b border-red-500/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-200">
                  <span className="font-medium">Sign-in Error:</span> {signInError}
                </p>
              </div>
              <button 
                onClick={() => {
                  onDismissSignInError();
                  addBreadcrumb('User dismissed error banner', 'ui');
                }}
                className="text-red-300 hover:text-red-200 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Header */}
      <header className={`fixed left-1 right-1 z-40 ${signInError ? 'top-16' : 'top-1'}`}>
        <div className="bg-black/50 backdrop-blur-xl border border-black/50 rounded-full shadow-2xl h-14 flex items-center justify-between px-4">
          {/* Left Section - Logo */}
          <div className="flex-1 flex items-center justify-start">
            <button
              onClick={handleLogoClick}
              className="hover:opacity-80 transition-all duration-300 transform hover:scale-105"
            >
              <img 
                src="/Glowing Infinity in Frosted Glass copy copy.png" 
                alt="StyleDrop Logo" 
                className="h-8 w-auto object-contain"
                style={{ filter: 'brightness(1.2) contrast(1.1)' }}
              />
            </button>
          </div>

          {/* Center Section - Decode Button */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => {
                onDecodeClick();
                addBreadcrumb('Decode button clicked', 'ui');
              }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-2xl transition-colors font-mono tracking-wide hover:bg-black/20 text-[#C78D4E] hover:text-[#D79D5E]"
            >
              <Code size={16} />
              <span className="hidden sm:block">Decode Media</span>
            </button>
          </div>

          {/* Right Section - User Authentication */}
          <div className="flex-1 flex items-center justify-end">
            <div className="flex items-center gap-4">
              {/* Authentication Section */}
              {loading ? (
                /* Loading State */
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-black/50 text-white/50 font-mono tracking-wide">
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span className="hidden sm:block">Loading...</span>
                </div>
              ) : user ? (
                /* Signed In State */
                <div 
                  className="relative"
                  onMouseEnter={() => setShowProfileMenu(true)}
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <button className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/60 transition-colors flex items-center justify-center text-[#7C9A92]">
                    {user.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url}
                        alt="Profile" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div className="absolute top-12 right-0 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl py-2 min-w-[160px] z-50">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-white text-sm font-medium">
                          {getDisplayName()}
                        </p>
                        <p className="text-white/60 text-xs">
                          {user.email}
                        </p>
                        {user.username && (
                          <p className="text-purple-400 text-xs font-mono">
                            @{user.username}
                          </p>
                        )}
                      </div>

                      {/* Account Settings */}
                      <button
                        onClick={handleAccountClick}
                        className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                      >
                        <Settings size={16} />
                        <span>Account</span>
                      </button>

                      {/* Sign Out */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Signed Out State */
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-2xl transition-colors font-mono tracking-wide bg-black/50 hover:bg-black/60 text-[#B8A082]"
                >
                  <LogIn size={16} />
                  <span className="hidden sm:block">Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};