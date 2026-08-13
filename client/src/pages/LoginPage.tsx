import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMusic, FiCheckCircle, FiRadio, FiDownloadCloud, FiZap } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (user || token) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Ensure redirect goes directly to full API URL if needed or relative path
  const googleAuthUrl = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/auth/google`
    : '/api/auth/google';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0d14] via-[#121824] to-[#05130b] flex items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
      {/* Dynamic Background Glow Spheres */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-spotify-green/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 relative z-10 border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/40 rounded-3xl">
        {/* Header Logo & Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-spotify-green to-emerald-400 flex items-center justify-center shadow-lg shadow-spotify-green/20 mb-4 transform hover:scale-105 transition-transform duration-300">
            <FiMusic className="text-black text-3xl font-bold" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome to <span className="text-spotify-green">SK Music</span>
          </h1>
          <p className="text-spotify-lightgray text-sm max-w-xs">
            Your high-performance, offline-first music streaming experience.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3.5 mb-8 bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <FiZap className="text-spotify-green flex-shrink-0" size={18} />
            <span>Stream Spotify & YouTube Music seamless</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <FiDownloadCloud className="text-spotify-green flex-shrink-0" size={18} />
            <span>Download tracks for offline listening</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <FiRadio className="text-spotify-green flex-shrink-0" size={18} />
            <span>Smart radio & personal recommendations</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <FiCheckCircle className="text-spotify-green flex-shrink-0" size={18} />
            <span>Sync library across all mobile & web devices</span>
          </div>
        </div>

        {/* Google OAuth Login Button */}
        <a
          href={googleAuthUrl}
          className="w-full bg-white text-black font-semibold py-3.5 px-6 rounded-2xl 
                     hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98] transition-all duration-200 
                     flex items-center justify-center gap-3 text-base shadow-md cursor-pointer decoration-none"
        >
          <FcGoogle size={24} />
          <span>Continue with Google</span>
        </a>

        {/* Footer Note */}
        <p className="text-xs text-spotify-lightgray text-center mt-6 leading-relaxed">
          By signing in, you agree to our Terms of Service. Designed for personal and educational music streaming.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
