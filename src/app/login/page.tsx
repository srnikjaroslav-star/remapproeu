'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// ALLOWED_EMAIL - Only this email can log in
const ALLOWED_EMAIL = 'info@remappro.eu';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check if user is already logged in
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Verify email matches allowed email
        if (session.user.email === ALLOWED_EMAIL) {
          router.push('/admin');
          return;
        } else {
          // Wrong email, sign out
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || 'Prihlásenie zlyhalo');
        setIsLoading(false);
        return;
      }

      // Check if email matches allowed email
      if (data.user?.email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut();
        toast.error('Nemáte oprávnenie na prístup');
        setIsLoading(false);
        return;
      }

      // Success - redirect to admin
      toast.success('Úspešne prihlásený');
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Chyba pri prihlásení');
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00d2ff] animate-pulse">Kontrola...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg p-8 shadow-[0_0_30px_rgba(0,210,255,0.3)]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-[#00d4ff] tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]">
            REMAPPRO
          </h1>
          <p className="text-[#00d4ff]/40 text-[10px] tracking-[0.4em] uppercase font-light text-center w-full">
            Security Access Portal
          </p>
        </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.com"
                required
                autoComplete="email"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:border-[#00d2ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Heslo <span className="text-red-400">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:border-[#00d2ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Prihlasujem...' : 'Prihlásiť sa'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
