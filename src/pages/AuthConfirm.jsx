import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Map, Pizza, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function getHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash);
}

function friendlyMessage(raw) {
  if (!raw) return 'No pudimos confirmar tu email. Pide un enlace nuevo e intentalo otra vez.';
  const text = String(raw);
  if (text.includes('expired') || text.includes('otp_expired')) return 'Este enlace ha caducado. Pide uno nuevo desde la pantalla de acceso.';
  if (text.includes('invalid')) return 'Este enlace no es valido o ya fue usado. Pide uno nuevo e intentalo otra vez.';
  if (text.includes('stole it') || text.includes('released because another request stole it')) {
    return 'El enlace ya fue procesado. Vamos a comprobar si tu cuenta quedo confirmada igualmente.';
  }
  return text;
}

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/home';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Estamos confirmando tu email y preparando tu acceso.');

  useEffect(() => {
    let active = true;

    async function run() {
      if (!supabase) {
        if (!active) return;
        setStatus('error');
        setMessage('El acceso todavia no esta conectado en esta version.');
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
          setMessage('Tu cuenta ya estaba confirmada. Entrando en Sozzial...');
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
          throw new Error('Faltan datos de confirmacion en el enlace.');
        }

        if (!active) return;
        setStatus('success');
        setMessage('Email confirmado correctamente. Ya puedes usar spots, planes y grupos.');
        window.history.replaceState({}, document.title, '/auth/confirm');
        window.setTimeout(() => navigate(next, { replace: true }), 900);
      } catch (error) {
        const msg = friendlyMessage(error?.message || error);

        if (msg.includes('Vamos a comprobar')) {
          try {
            const retry = await supabase.auth.getSession();
            if (retry?.data?.session?.user) {
              if (!active) return;
              setStatus('success');
              setMessage('Tu cuenta ya quedo confirmada. Entrando en Sozzial...');
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
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efbf3a] text-[#141414] shadow-[0_18px_38px_rgba(239,191,58,0.24)]"><Pizza className="h-7 w-7" /></div>
        <h1 className="text-3xl font-black tracking-tight">Sozzial</h1>
        <p className="mt-2 text-[#6d665b]">Confirmacion de email</p>

        <div className="mt-8 rounded-[28px] border border-black/8 bg-white p-6 text-center">
          {status === 'loading' && <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#dbab23]" />}
          {success && <CheckCircle2 className="mx-auto h-10 w-10 text-[#3e9444]" />}
          {status === 'error' && <XCircle className="mx-auto h-10 w-10 text-[#e25545]" />}
          <p className="mt-5 text-sm leading-7 text-[#5f584e]">{message}</p>
          {success && (
            <div className="mt-5 rounded-2xl border border-[#d8ebd4] bg-[#eef7ec] p-4 text-left text-sm text-[#2f7a35]">
              <div className="font-semibold">Tu cuenta esta activa.</div>
              <div className="mt-1">Ya puedes crear planes, anadir spots y unirte a grupos.</div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <Link to="/home" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#3e9444] text-sm font-bold text-white hover:bg-[#2f7a35]">
            <Map className="mr-2 h-4 w-4" />
            Explorar el mapa
          </Link>
          <Link to="/auth" className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-sm font-semibold text-[#141414] hover:bg-[#fffdf8]">
            Ir al acceso
          </Link>
        </div>
      </div>
    </div>
  );
}


