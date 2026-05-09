import React from "react";
import { Link } from "react-router-dom";
import { Flame, Heart, User, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function MapBottomNav({ onAddPin }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[700] bg-[#0a0a0a] border-t border-white/5" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-center sm:justify-around gap-1 sm:gap-4">
        <button
          onClick={onAddPin}
          className="flex-1 sm:flex-none flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-medium hidden sm:inline">Add Plan</span>
        </button>

        <Link
          to={createPageUrl("Descubrir")}
          className="flex-1 sm:flex-none flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Flame className="w-5 h-5" />
          <span className="text-xs font-medium hidden sm:inline">Discover</span>
        </Link>

        <Link
          to={createPageUrl("MisMatches")}
          className="flex-1 sm:flex-none flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Heart className="w-5 h-5" />
          <span className="text-xs font-medium hidden sm:inline">Groups</span>
        </Link>

        <Link
          to={createPageUrl("Profile")}
          className="flex-1 sm:flex-none flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium hidden sm:inline">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

