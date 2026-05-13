import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Map, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function getHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash);
}

function friendlyMessage(raw) {
  if (!raw) return 'We could not confirm your email. Request a new link and try again.';
  const text = String(raw);
  if (text.toLowerCase().includes('database error saving new user')) return 'Your email was accepted, but Supabase could not create the profile. Run SUPABASE_FIX_AUTH_AND_RECIPES.sql once in SQL Editor, then sign in again.';
  if (text.includes('expired') || text.includes('otp_expired')) return 'This link has expired. Request a new one from the sign-in screen.';
  if (text.includes('invalid')) return 'This link is invalid or has already been used. Request a new one and try again.';
  if (text.includes('stole it') || text.includes('released because another request stole it')) {
    return 'This link was already processed. We will check whether your account is confirmed anyway.';
  }
  return text;
}

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/home';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('We are confirming your email and preparing your access.');

  useEffect(() => {
    let active = true;

    async function run() {
      if (!supabase) {
        if (!active) return;
        setStatus('error');
        setMessage('Authentication is not configured in this build.');
        return;
      }

      const hashParams = getHashParams();
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const type = searchParams.get('type') || hashParams.get('type') || 'email';
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const urlError = searchParams.get('error_description') || hashParams.get('error_description') || searchParams.get('error') || hashParams.get('error');

      try {
        if (urlError) throw new Error(urlError);

        const existing = await supabase.auth.getSession();
        if (existing?.data?.session?.user) {
          if (!active) return;
          setStatus('success');
          setMessage('Your account was already confirmed. Taking you into Sozzial...');
          window.history.replaceState({}, document.title, '/auth/confirm');
          window.setTimeout(() => navigate(next, { replace: true }), 900);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else {
          throw new Error('The confirmation link is missing required data.');
        }

        if (!active) return;
        setStatus('success');
        setMessage('Email confirmed. You can now use spots, plans and groups.');
        window.history.replaceState({}, document.title, '/auth/confirm');
        window.setTimeout(() => navigate(next, { replace: true }), 900);
      } catch (error) {
        const msg = friendlyMessage(error?.message || error);

        if (msg.includes('We will check') || msg.includes('already processed')) {
          try {
            const retry = await supabase.auth.getSession();
            if (retry?.data?.session?.user) {
              if (!active) return;
              setStatus('success');
              setMessage('Your account is already confirmed. Taking you into Sozzial...');
              window.history.replaceState({}, document.title, '/auth/confirm');
              window.setTimeout(() => navigate(next, { replace: true }), 900);
              return;
            }
          } catch {}
        }

        if (!active) return;
        setStatus('error');
        setMessage(msg);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [navigate, next, searchParams]);

  const success = status === 'success';

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4efe6] px-6 text-[#141414]">
      <div className="w-full max-w-md rounded-[34px] border border-black/8 bg-[#fffaf2] p-6 shadow-[0_24px_60px_rgba(39,29,14,0.12)]">
        <img src="/logo.svg" alt="Sozzial" className="mb-5 h-16 w-auto max-w-[210px] object-contain" />
        <h1 className="sr-only">Sozzial</h1>
        <p className="mt-2 text-[#6d665b]">Email confirmation</p>

        <div className="mt-8 rounded-[28px] border border-black/8 bg-white p-6 text-center">
          {status === 'loading' && <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#dbab23]" />}
          {success && <CheckCircle2 className="mx-auto h-10 w-10 text-[#3e9444]" />}
          {status === 'error' && <XCircle className="mx-auto h-10 w-10 text-[#e25545]" />}
          <p className="mt-5 text-sm leading-7 text-[#5f584e]">{message}</p>
          {success && (
            <div className="mt-5 rounded-2xl border border-[#d8ebd4] bg-[#eef7ec] p-4 text-left text-sm text-[#2f7a35]">
              <div className="font-semibold">Your account is active.</div>
              <div className="mt-1">You can now create plans, add spots and join groups.</div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <Link to="/home" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#3e9444] text-sm font-bold text-white hover:bg-[#2f7a35]">
            <Map className="mr-2 h-4 w-4" />
            Explore the map
          </Link>
          <Link to="/auth" className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-sm font-semibold text-[#141414] hover:bg-[#fffdf8]">
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}


