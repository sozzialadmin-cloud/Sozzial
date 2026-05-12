import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChefHat, Clock3, Flame, Heart, Pizza, Scale, Thermometer, Trophy, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { fetchHomeRecipeById, voteHomeRecipe } from '@/lib/social-data';
import { getPublicUsername } from '@/lib/display-name';

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

export default function RecipeDetail() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useQuery({
    queryKey: ['home-recipe', recipeId, user?.id],
    enabled: Boolean(recipeId),
    queryFn: () => fetchHomeRecipeById(recipeId, user?.id),
  });

  const voteMutation = useMutation({
    mutationFn: () => voteHomeRecipe({ userId: user?.id, recipeId: recipe.id, liked: recipe.viewer_liked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-recipe', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-rankings'] });
    },
    onError: (error) => toast.error(error?.message || 'Could not vote this recipe.'),
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
                <Button disabled={!user?.id || voteMutation.isPending} onClick={() => voteMutation.mutate()} className={`h-12 rounded-[18px] px-5 font-black ${recipe.viewer_liked ? 'bg-[#27231f] text-white hover:bg-[#111]' : 'bg-[#d82424] text-white hover:bg-[#b91f1f]'}`}>
                  <Heart className={`mr-2 h-5 w-5 ${recipe.viewer_liked ? 'fill-white' : ''}`} />
                  {recipe.viewer_liked ? 'Liked' : 'Like recipe'}
                </Button>
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
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}