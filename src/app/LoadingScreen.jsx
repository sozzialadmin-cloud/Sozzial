import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#f4efe6]">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-[28px] bg-[#fffaf1] shadow-[0_24px_70px_rgba(34,25,11,0.14)]">
          <img src="/mobile-icon.svg" alt="Sozzial" className="h-14 w-14 animate-pulse object-contain" />
        </div>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/10">
          <div className="h-full w-1/2 animate-[loading-bar_1s_ease-in-out_infinite] rounded-full bg-[#df5b43]" />
        </div>
      </div>
    </div>
  );
}