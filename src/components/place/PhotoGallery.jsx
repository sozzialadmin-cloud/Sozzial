import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getPublicUsername, getAvatarLetter } from "@/lib/display-name";

async function uploadSpotPhoto(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `${userId}/${fileName}`;
  const { error: uploadError } = await supabase.storage.from("spot-photos").upload(filePath, file, { upsert: false });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("spot-photos").getPublicUrl(filePath);
  return { filePath, publicUrl: data?.publicUrl || null };
}

export default function PhotoGallery({ placeId, photos, user, onRequireAuth }) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();
  const queryClient = useQueryClient();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      onRequireAuth();
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadSpotPhoto(file, user.id);
      const { error } = await supabase.from("spot_photos").insert({
        spot_id: placeId,
        user_id: user.id,
        photo_url: uploaded.filePath,
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["spot-photos", placeId] });
      alert("Photo sent for review.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const navigateLightbox = (dir) => {
    if (lightbox === null) return;
    const next = lightbox + dir;
    if (next >= 0 && next < photos.length) setLightbox(next);
  };

  return (
    <div>
      <div className="mb-4">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-stone-300 hover:text-white hover:bg-white/5"
          onClick={() => {
            if (!user) { onRequireAuth(); return; }
            fileRef.current?.click();
          }}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
          {uploading ? "Uploading..." : "Add photo"}
        </Button>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8">
          <Camera className="w-8 h-8 text-stone-700 mx-auto mb-2" />
          <p className="text-stone-500 text-sm">No photos yet. Add the first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, idx) => (
            <button key={photo.id} onClick={() => setLightbox(idx)} className="aspect-[4/3] rounded-xl overflow-hidden bg-white/5 hover:opacity-80 transition">
              <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-4 right-4 text-white/60 hover:text-white z-10" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
            {lightbox > 0 && <button className="absolute left-4 text-white/60 hover:text-white z-10" onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}><ChevronLeft className="w-8 h-8" /></button>}
            {lightbox < photos.length - 1 && <button className="absolute right-4 text-white/60 hover:text-white z-10" onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}><ChevronRight className="w-8 h-8" /></button>}
            <img src={photos[lightbox]?.photo_url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-4 text-stone-400 text-xs">{getPublicUsername(photos[lightbox]?.profile)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
