'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Navbar({ credits }: { credits?: number | null }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync internal credits state with props when scans decrement
  useEffect(() => {
    if (typeof credits === 'number') {
      setUserCredits(credits);
    }
  }, [credits]);

  useEffect(() => {
    async function loadSession() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('scan_credits')
          .eq('id', user.id)
          .single();

        if (data) setUserCredits(data.scan_credits);
      }
      setLoading(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('scan_credits')
          .eq('id', session.user.id)
          .single();
        if (data) setUserCredits(data.scan_credits);
      } else {
        setUserCredits(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserCredits(null);
  };

  return (
    <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
      <div className="flex items-center space-x-2">
        <span className="font-mono text-xs font-bold tracking-widest text-emerald-400">
          // THE GHOST ENGINEER
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-slate-800" />
        ) : user ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs">
              <span className="text-slate-400">Scans Left:</span>
              <span className="font-bold text-emerald-400">
                {userCredits ?? 0}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="rounded px-2.5 py-1 text-xs text-slate-400 transition hover:text-white"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="flex items-center space-x-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            <span>Sign In with Google</span>
          </button>
        )}
      </div>
    </nav>
  );
}