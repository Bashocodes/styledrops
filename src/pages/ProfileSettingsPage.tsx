import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Save, Loader2, Check, X, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { addBreadcrumb, captureError } from '../lib/sentry';
import { updateUserProfileUsername, getUserProfile } from '../lib/supabaseUtils';
import { DEFAULTS } from '../constants';

interface ProfileSettingsPageProps {
  onBack: () => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile data
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [lastUsernameChange, setLastUsernameChange] = useState<Date | null>(null);
  
  // Validation
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        addBreadcrumb('Loading user profile for settings', 'ui', { userId: user.id });
        
        const profile = await getUserProfile(user.id);
        
        setCurrentUsername(profile.username || '');
        setNewUsername(profile.username || '');
        setFullName(profile.full_name || '');
        setBio(profile.bio || '');
        setLastUsernameChange(profile.last_username_change_at ? new Date(profile.last_username_change_at) : null);
        
        addBreadcrumb('Profile loaded successfully', 'ui');
      } catch (error) {
        console.error('Failed to load profile:', error);
        setError('Failed to load profile data. Please try again.');
        captureError(error as Error, { context: 'loadProfile' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return 'Username is required';
    }
    
    if (username.length < DEFAULTS.USERNAME_MIN_LENGTH) {
      return `Username must be at least ${DEFAULTS.USERNAME_MIN_LENGTH} characters`;
    }
    
    if (username.length > DEFAULTS.USERNAME_MAX_LENGTH) {
      return `Username must be less than ${DEFAULTS.USERNAME_MAX_LENGTH} characters`;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    
    return null;
  };

  const canChangeUsername = (): boolean => {
    if (!lastUsernameChange) return true;
    
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - DEFAULTS.USERNAME_CHANGE_COOLDOWN_DAYS);
    
    return lastUsernameChange <= cooldownDate;
  };

  const getDaysUntilUsernameChange = (): number => {
    if (!lastUsernameChange) return 0;
    
    const thirtyDaysFromLastChange = new Date(lastUsernameChange);
    thirtyDaysFromLastChange.setDate(thirtyDaysFromLastChange.getDate() + DEFAULTS.USERNAME_CHANGE_COOLDOWN_DAYS);
    
    const now = new Date();
    const diffTime = thirtyDaysFromLastChange.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    setUsernameError(validateUsername(value));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate username
    const validationError = validateUsername(newUsername);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    // Check if username changed
    if (newUsername === currentUsername) {
      setError('No changes to save');
      return;
    }

    // Check if user can change username
    if (!canChangeUsername()) {
      const daysRemaining = getDaysUntilUsernameChange();
      setError(`You can only change your username once every ${DEFAULTS.USERNAME_CHANGE_COOLDOWN_DAYS} days. Please wait ${daysRemaining} more days.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      addBreadcrumb('Saving username change', 'ui', { 
        userId: user.id, 
        oldUsername: currentUsername, 
        newUsername 
      });
      
      await updateUserProfileUsername(user.id, newUsername);
      
      setCurrentUsername(newUsername);
      setLastUsernameChange(new Date());
      setSuccess('Username updated successfully!');
      
      addBreadcrumb('Username updated successfully', 'ui');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to update username:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update username';
      setError(errorMessage);
      captureError(error as Error, { context: 'updateUsername' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#B8A082] animate-spin mx-auto mb-4" />
            <p className="text-white/70 text-lg">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#B8A082]/20 to-[#7C9A92]/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-[#B8A082]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Profile Settings</h1>
              <p className="text-gray-400 text-sm">Manage your account preferences</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-6">
          {/* Current User Info */}
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-white/10">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url}
                alt="Profile" 
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-r from-[#B8A082]/20 to-[#7C9A92]/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-[#B8A082]" />
              </div>
            )}
            <div>
              <p className="text-white font-medium">{fullName || 'No name set'}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <p className="text-[#B8A082] text-sm font-mono">@{currentUsername}</p>
            </div>
          </div>

          {/* Username Section */}
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={newUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  disabled={!canChangeUsername() || saving}
                  className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    usernameError 
                      ? 'border-red-500/50 focus:ring-red-500/20' 
                      : 'border-white/10 focus:border-[#B8A082]/50 focus:ring-[#B8A082]/20'
                  } ${
                    !canChangeUsername() || saving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter your username"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  @
                </div>
              </div>
              
              {/* Username validation error */}
              {usernameError && (
                <p className="text-red-400 text-sm mt-1 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{usernameError}</span>
                </p>
              )}
              
              {/* Username change restriction */}
              {!canChangeUsername() && (
                <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-orange-200 text-sm">
                        You can only change your username once every {DEFAULTS.USERNAME_CHANGE_COOLDOWN_DAYS} days.
                      </p>
                      <p className="text-orange-300 text-xs mt-1">
                        Next change available in {getDaysUntilUsernameChange()} days.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Username guidelines */}
              <div className="mt-2 text-xs text-gray-500">
                <p>• {DEFAULTS.USERNAME_MIN_LENGTH}-{DEFAULTS.USERNAME_MAX_LENGTH} characters</p>
                <p>• Letters, numbers, and underscores only</p>
                <p>• Can be changed once every {DEFAULTS.USERNAME_CHANGE_COOLDOWN_DAYS} days</p>
              </div>
            </div>
          </div>

          {/* Full Name Section (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
              placeholder="Synced from Google account"
            />
            <p className="text-xs text-gray-500">
              Full name is synced from your Google account and cannot be changed here.
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start space-x-2">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onBack}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-300 hover:text-white transition-all duration-300 disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !!usernameError || newUsername === currentUsername || !canChangeUsername()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#B8A082] to-[#A69072] hover:from-[#A69072] hover:to-[#958060] rounded-lg text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          <h3 className="text-white font-medium mb-2">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Account created:</span>
              <span className="text-white">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last sign in:</span>
              <span className="text-white">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
            {lastUsernameChange && (
              <div className="flex justify-between">
                <span className="text-gray-400">Username last changed:</span>
                <span className="text-white">{lastUsernameChange.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};