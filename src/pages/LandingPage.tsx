import React from 'react';
import { Sparkles, Play, Palette, Wand2, Image, Music, Video, ArrowRight, Shield, Zap, Users } from 'lucide-react';

interface LandingPageProps {
  onSignInWithGoogle: () => Promise<void>;
  signInError: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInWithGoogle, signInError }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 pt-32">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10 mb-6">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-white/80 text-sm font-medium">AI-Powered Style Analysis</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white bg-gradient-to-r from-purple-400 via-white to-blue-400 bg-clip-text text-transparent mb-8 leading-tight">
            StyleDrop
          </h1>
          
          <h2 className="text-2xl md:text-4xl font-medium text-gray-200 mb-6 leading-relaxed">
            Discover, Mix, and Analyze
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              AI Art Styles
            </span>
          </h2>
          
          <p className="text-gray-300 text-xl max-w-4xl mx-auto leading-relaxed mb-12">
            Upload any image, video, or audio file and unlock its creative DNA. Get instant style analysis, 
            creative prompts, and remix ideas powered by advanced AI technology.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={onSignInWithGoogle}
              className="group flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-2xl text-white font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
            >
              <span>Start Creating with Google</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {signInError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 max-w-md">
                <p className="text-red-300 text-sm">{signInError}</p>
              </div>
            )}
            
            <p className="text-gray-400 text-sm">
              Free to use • No credit card required • Instant access
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-16">
            Unlock Your Creative Potential
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">Style Analysis</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Upload any media and get instant AI-powered analysis of colors, composition, mood, and artistic style with detailed breakdowns.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Wand2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">Creative Prompts</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Generate ready-to-use prompts for MidJourney, Stable Diffusion, and other AI art tools based on your uploaded content.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">Creative Remixes</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Get story prompts, animation ideas, music suggestions, and creative variations to expand your artistic vision.
              </p>
            </div>
          </div>
        </section>

        {/* Media Types */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-16">
            Works with Any Media Type
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 text-center hover:bg-white/10 transition-all duration-300">
              <Image className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Images</h3>
              <p className="text-gray-400 text-sm">JPG, PNG, GIF, WebP</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 text-center hover:bg-white/10 transition-all duration-300">
              <Video className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Videos</h3>
              <p className="text-gray-400 text-sm">MP4, WebM, OGG</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 text-center hover:bg-white/10 transition-all duration-300">
              <Music className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Audio</h3>
              <p className="text-gray-400 text-sm">MP3, WAV, OGG</p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-12">
              Why Choose StyleDrop?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
                <p className="text-gray-400 text-sm">Get instant analysis results powered by cutting-edge AI technology</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Secure & Private</h3>
                <p className="text-gray-400 text-sm">Your uploads are processed securely and never shared without permission</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Community Driven</h3>
                <p className="text-gray-400 text-sm">Share your creations and discover amazing styles from other artists</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-3xl border border-white/10 p-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
              Ready to Transform Your Creative Process?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of artists, designers, and creators who are already using StyleDrop to unlock new creative possibilities.
            </p>
            
            <button
              onClick={onSignInWithGoogle}
              className="group flex items-center space-x-3 px-10 py-5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-2xl text-white font-semibold text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25 mx-auto"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded opacity-80"></div>
              <span className="text-sm text-gray-500">StyleDrop © 2025</span>
            </div>
            <div className="text-sm text-gray-600">
              Powered by creativity and AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};