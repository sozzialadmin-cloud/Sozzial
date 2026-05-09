import React from 'react';
import { Coffee } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const DEFAULT_URL = 'https://buymeacoffee.com';
const HIDDEN_ROUTES = new Set(['/home', '/descubrir', '/auth']);

export default function FloatingSupportButton() {
  const { pathname } = useLocation();
  const href = import.meta.env.VITE_BUYMEACOFFEE_URL;

  if (!href || href === DEFAULT_URL || HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Support Pizzapolis on Buy Me a Coffee"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[1600] inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-[#fff9ef] px-3 text-sm font-semibold text-[#1a1712] shadow-[0_16px_34px_rgba(27,22,15,0.14)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#f0bf39] md:bottom-5"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0bf39] text-[#1a1712]">
        <Coffee className="h-4 w-4" />
      </span>
      <span>Support</span>
    </a>
  );
}

