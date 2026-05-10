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
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 text-red-200">
              <Pizza className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Entra en Sozzial</h3>
            <p className="text-stone-400 text-sm mb-6 leading-relaxed">
              {message || "Inicia sesion para valorar sitios, subir fotos y participar en los mejores planes de pizza."}
            </p>
            <Button
              className="w-full bg-red-600 hover:bg-red-500 text-white font-medium h-11"
              onClick={() => navigate(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <p className="mt-4 text-xs text-stone-600">Gratis. Sin ruido. Solo planes reales.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
