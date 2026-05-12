import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChefHat, Clock3, Flag, Flame, Heart, MessageCircle, Pizza, Scale, Send, Thermometer, Trophy, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { createRecipeComment, createReport, fetchHomeRecipeById, fetchRecipeComments, voteHomeRecipe } from '@/lib/social-data';
import { getAvatarLetter, getPublicUsername } from '@/lib/display-name';

const reportReasons = ['Spam or scam', 'Harassment', 'Hate or abuse', 'Unsafe advice', 'Stolen photo', 'Misleading content', 'Other'];

function splitLines(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function MetaPill({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-[18px] border border-black/8 bg-white/78 px-3 py-2 shadow-[0_10px_26px_rgba(65,42,18,0.06)]">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a8174]">
        <Icon className="h-3.5 w-3.5 text-[#d82424]" />
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-[#27231f]">{value}</div>
    </div>
  );
}

function CommentAvatar({ profile }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#27231f] text-sm font-black text-[#efbf3a]">
      {profile?.avatar_url?.startsWith?.('http') ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : getAvatarLetter(profile, '?')}
    </div>
  );
}

export default function RecipeDetail() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportDetails, setReportDetails] = useState('');

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['home-recipe', recipeId, user?.id],
    enabled: Boolean(recipeId),
    queryFn: () => fetchHomeRecipeById(recipeId, user?.id),
  });
  const { data: comments = [] } = useQuery({
    queryKey: ['recipe-comments', recipeId],
    enabled: Boolean(recipeId),
    queryFn: () => fetchRecipeComments(recipeId),
  });

  const voteMutation = useMutation({
    mutationFn: () => voteHomeRecipe({ userId: user?.id, recipeId: recipe.id, liked: recipe.viewer_liked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-recipe', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-rankings'] });
    },
    onError: (error) => toast.error(error?.message || 'Could not vote this recipe.'),
  });

  const commentMutation = useMutation({
    mutationFn: () => createRecipeComment({ userId: user?.id, recipeId, content: comment }),
    onSuccess: async () => {
      setComment('');
      toast.success('Comment published');
      await queryClient.invalidateQueries({ queryKey: ['recipe-comments', recipeId] });
      await queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
    onError: (error) => toast.error(error?.message || 'Could not publish comment.'),
  });

  const reportMutation = useMutation({
    mutationFn: () => createReport({ reporterId: user?.id, entityType: 'recipe', entityId: recipeId, reason: reportReason, details: reportDetails }),
    onSuccess: () => {
      setShowReport(false);
      setReportDetails('');
      setReportReason(reportReasons[0]);
      toast.success('Report sent to moderation');
    },
    onError: (error) => toast.error(error?.message || 'Could not send report.'),
  });

  const ingredients = splitLines(recipe?.ingredients);
  const steps = splitLines(recipe?.preparation_steps);
  const authorName = getPublicUsername(recipe?.profiles, 'Sozzial cook');

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] bg-[#f7efe3] px-3 py-4 pb-[calc(var(--mobile-nav-height)+1rem)] text-[#27231f] sm:px-5 sm:py-6 sm:pb-6">
      <main className="mx-auto max-w-4xl">
        <button type="button" onClick={() => navigate(-1)} className="premium-press inline-flex h-11 items-center gap-2 rounded-[18px] border border-black/8 bg-white/78 px-4 text-sm font-black shadow-[0_12px_26px_rgba(65,42,18,0.08)]">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {isLoading ? <div className="mt-4 rounded-[28px] bg-white/78 p-8 text-center font-bold text-[#756b5f]">Loading recipe...</div> : null}
        {!isLoading && !recipe ? <div className="mt-4 rounded-[28px] bg-white/78 p-8 text-center font-bold text-[#756b5f]">Recipe not found.</div> : null}

        {recipe ? (
          <article className="mt-4 overflow-hidden rounded-[32px] border border-black/8 bg-[#fffaf1] shadow-[0_26px_70px_rgba(65,42,18,0.13)]">
            {recipe.photo_url ? <img src={recipe.photo_url} alt={recipe.title} className="h-56 w-full object-cover sm:h-72" /> : null}
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#d82424] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                  <ChefHat className="h-3.5 w-3.5" />
                  Home recipe
                </span>
                <span className="rounded-full bg-[#27231f] px-3 py-1 text-[11px] font-black text-white">{recipe.likes_count || 0} likes</span>
                <span className="rounded-full bg-[#2f8f46] px-3 py-1 text-[11px] font-black text-white">{comments.length} comments</span>
                {Array.isArray(recipe.tags) ? recipe.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-[#f1e5d5] px-3 py-1 text-[11px] font-black text-[#6c6257]">{tag}</span>) : null}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <h1 className="text-[clamp(2rem,9vw,4rem)] font-black leading-none tracking-[-0.055em]">{recipe.title}</h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-[#6c6257]">{recipe.description}</p>
                  <Link to={`/profile/${recipe.user_id}`} className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-2 text-sm font-black shadow-[0_10px_24px_rgba(65,42,18,0.07)]">
                    <UserRound className="h-4 w-4 text-[#d82424]" />
                    @{authorName}
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Button disabled={!user?.id || voteMutation.isPending} onClick={() => voteMutation.mutate()} className={`h-12 rounded-[18px] px-5 font-black ${recipe.viewer_liked ? 'bg-[#27231f] text-white hover:bg-[#111]' : 'bg-[#d82424] text-white hover:bg-[#b91f1f]'}`}>
                    <Heart className={`mr-2 h-5 w-5 ${recipe.viewer_liked ? 'fill-white' : ''}`} />
                    {recipe.viewer_liked ? 'Liked' : 'Like recipe'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowReport(true)} className="h-12 rounded-[18px] border-black/10 bg-white text-[#27231f]">
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetaPill icon={Pizza} label="Dough" value={recipe.dough_style} />
                <MetaPill icon={Thermometer} label="Oven" value={recipe.oven_temp} />
                <MetaPill icon={Clock3} label="Time" value={recipe.bake_time} />
                <MetaPill icon={Scale} label="Servings" value={recipe.servings} />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr,1fr]">
                <section className="rounded-[26px] border border-black/8 bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-lg font-black"><Flame className="h-5 w-5 text-[#d82424]" /> Ingredients</div>
                  {ingredients.length ? (
                    <ul className="mt-3 grid gap-2">
                      {ingredients.map((item, index) => <li key={`${item}-${index}`} className="rounded-2xl bg-[#f7efe3] px-3 py-2 text-sm font-semibold text-[#5f584d]">{item}</li>)}
                    </ul>
                  ) : <p className="mt-3 text-sm text-[#756b5f]">No ingredients added yet.</p>}
                </section>
                <section className="rounded-[26px] border border-black/8 bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-lg font-black"><Trophy className="h-5 w-5 text-[#efbf3a]" /> Preparation</div>
                  {steps.length ? (
                    <ol className="mt-3 grid gap-2">
                      {steps.map((item, index) => <li key={`${item}-${index}`} className="grid grid-cols-[2rem_1fr] gap-2 rounded-2xl bg-[#f7efe3] px-3 py-2 text-sm font-semibold text-[#5f584d]"><span className="font-black text-[#d82424]">{index + 1}</span><span>{item}</span></li>)}
                    </ol>
                  ) : <p className="mt-3 text-sm text-[#756b5f]">No preparation steps added yet.</p>}
                </section>
              </div>

              <section className="mt-5 rounded-[26px] border border-black/8 bg-white/72 p-4">
                <div className="flex items-center gap-2 text-lg font-black"><MessageCircle className="h-5 w-5 text-[#2f8f46]" /> Community notes</div>
                <div className="mt-3 flex gap-2">
                  <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ask a question, share a tip, or say what you changed..." className="min-h-[76px] flex-1 rounded-2xl border-black/10 bg-white text-[#27231f]" />
                  <Button disabled={!comment.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate()} className="h-[76px] rounded-2xl bg-[#2f8f46] px-4 font-black text-white hover:bg-[#26763a]">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 grid gap-3">
                  {comments.map((row) => (
                    <div key={row.id} className="flex gap-3 rounded-2xl border border-black/8 bg-[#fffaf1] p-3">
                      <CommentAvatar profile={row.profiles} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black">{getPublicUsername(row.profiles, 'Pizza friend')}</span>
                          <span className="text-xs font-bold text-[#9b9182]">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#5f584d]">{row.content}</p>
                      </div>
                    </div>
                  ))}
                  {!comments.length ? <div className="rounded-2xl border border-dashed border-black/10 p-5 text-center text-sm font-semibold text-[#756b5f]">No comments yet. Be the first to improve this recipe.</div> : null}
                </div>
              </section>
            </div>
          </article>
        ) : null}
      </main>

      {showReport ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => setShowReport(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-black/10 bg-[#fffaf1] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.26)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black">Report recipe</div>
                <p className="mt-1 text-sm leading-6 text-[#756b5f]">Choose a reason. Admins will review it from the moderation dashboard.</p>
              </div>
              <button type="button" onClick={() => setShowReport(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#f1e5d5]"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {reportReasons.map((reason) => (
                <button key={reason} type="button" onClick={() => setReportReason(reason)} className={`rounded-2xl border px-3 py-2 text-left text-xs font-black ${reportReason === reason ? 'border-[#d82424] bg-[#d82424] text-white' : 'border-black/10 bg-white text-[#5f584d]'}`}>{reason}</button>
              ))}
            </div>
            <Textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Optional details for the admin team..." className="mt-3 min-h-[96px] rounded-2xl border-black/10 bg-white text-[#27231f]" />
            <Button disabled={reportMutation.isPending} onClick={() => reportMutation.mutate()} className="mt-3 h-12 w-full rounded-2xl bg-[#d82424] font-black text-white hover:bg-[#b91f1f]">Send report</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}