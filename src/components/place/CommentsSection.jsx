import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { getAvatarLetter, getPublicUsername } from "@/lib/display-name";

function fmtDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function CommentsSection({ placeId, comments, user, onRequireAuth }) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const addComment = useMutation({
    mutationFn: async (commentText) => {
      const { error } = await supabase.from("spot_comments").insert({
        spot_id: placeId,
        user_id: user.id,
        content: commentText,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spot-comments", placeId] });
      setText("");
      toast.success("Comentario enviado a revision.");
    },
    onError: (error) => {
      toast.error(error?.message || "No se pudo enviar el comentario.");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!text.trim()) return;
    addComment.mutate(text.trim());
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder={user ? "Comparte tu experiencia..." : "Entra para comentar..."}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => {
            if (!user) onRequireAuth();
          }}
          className="min-h-[80px] resize-none border-white/10 bg-white/5 text-stone-200 placeholder:text-stone-600"
        />
        <Button type="submit" size="sm" disabled={!text.trim() || addComment.isPending} className="bg-red-600 text-white hover:bg-red-500">
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {addComment.isPending ? "Enviando..." : "Enviar a revision"}
        </Button>
      </form>

      {comments.length === 0 ? (
        <div className="py-8 text-center">
          <MessageCircle className="mx-auto mb-2 h-8 w-8 text-stone-700" />
          <p className="text-sm text-stone-500">Todavia no hay comentarios. Se el primero.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/30">
                    <span className="text-[10px] font-bold text-red-400">{getAvatarLetter(comment.profile, "?")}</span>
                  </div>
                  {comment.user_id ? (
                    <Link to={`/profile/${comment.user_id}`} className="text-sm font-medium text-stone-300 hover:text-white">
                      {getPublicUsername(comment.profile)}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-stone-300">{getPublicUsername(comment.profile)}</span>
                  )}
                </div>
                <span className="text-xs text-stone-600">{fmtDate(comment.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed text-stone-400">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
