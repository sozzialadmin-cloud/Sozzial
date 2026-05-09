import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#080808]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-700 border-t-red-500" />
    </div>
  );
}
