import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, Pizza, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPrompt({ open, onClose, message }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Pizza className="h-8 w-8 text-red-200" />
            </div>
            <h3 className="text-xl font-bold mb-2">Join the Hunt</h3>
            <p className="text-stone-400 text-sm mb-6 leading-relaxed">
              {message || "Sign in to rate places, share photos, and leave your thoughts on NYC's best pizza."}
            </p>
            <Button
              className="w-full bg-red-600 hover:bg-red-500 text-white font-medium h-11"
              onClick={() => navigate(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
            <p className="text-stone-600 text-xs mt-4">Free. No spam. Just pizza.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
