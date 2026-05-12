import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, CalendarDays, CheckCircle2, ChefHat, Heart, MapPin, MessageSquare, Pizza, Star, ThumbsUp, Trophy, UserCheck, UserPlus } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { getAvatarLetter, getPublicUsername } from '@/lib/display-name';
import { useAuth } from '@/lib/AuthContext';
import { fetchProfileRecipes, fetchProfileSocialState, setProfileFollow, voteHomeRecipe } from '@/lib/social-data';

async function resolveAvatar(value) {
  if (!value || !isSupabaseConfigured || !supabase) return '';
  if (String(value).startsWith('http')) return value;
  const { data } = await supabase.storage.from('avatars').createSignedUrl(value, 60 * 60);
  return data?.signedUrl || '';
}

async function fetchPublicProfile(userId, viewerId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
  const profileQuery = looksLikeUuid
    ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    : supabase.from('profiles').select('*').ilike('username', userId).limit(1).maybeSingle();

  const [profileRes, spotsRes] = await Promise.all([
    profileQuery,
    supabase.from('spots').select('id,name,address,best_slice,slice_price,average_rating,status,created_by,photo_url').limit(250),
  ]);

  if (profileRes.error) throw profileRes.error;
  const profile = profileRes.data || null;
  const resolvedId = profile?.id || userId;
  const [plansRes, ratingsRes, commentsRes, recipes] = profile
    ? await Promise.all([
        supabase.from('plans').select('id,title,plan_date,plan_time,status,created_by').eq('created_by', resolvedId).eq('status', 'active').order('plan_date', { ascending: true }).limit(8),
        supabase.from('spot_ratings').select('id,spot_id,rating,updated_at').eq('user_id', resolvedId).order('updated_at', { ascending: false }).limit(16),
        supabase.from('spot_comments').select('id,spot_id,content,status,created_at').eq('user_id', resolvedId).order('created_at', { ascending: false }).limit(12),
        fetchProfileRecipes(resolvedId, viewerId),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, []];

  const spots = spotsRes.error ? [] : spotsRes.data || [];
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));

  return {
    profile: profile ? { ...profile, avatar_resolved: await resolveAvatar(profile.avatar_url) } : null,
    favoriteSpot: spots.find((spot) => spot.id === profile?.favorite_spot_id) || null,
    createdSpots: spots.filter((spot) => spot.created_by === resolvedId && spot.status === 'approved'),
    plans: plansRes.error ? [] : plansRes.data || [],
    ratings: (ratingsRes.error ? [] : ratingsRes.data || []).map((rating) => ({ ...rating, spot: spotMap.get(rating.spot_id) || null })),
    comments: (commentsRes.error ? [] : commentsRes.data || []).filter((comment) => comment.status === 'approved').map((comment) => ({ ...comment, spot: spotMap.get(comment.spot_id) || null })),
    recipes,
  };
}

function CompactStat({ value, label }) {
  return (
    <div className="rounded-[18px] bg-white/75 px-3 py-3 text-center shadow-[0_10px_24px_rgba(65,42,18,0.07)]">
      <div className="text-xl font-black leading-none tracking-[-0.04em] text-[#d82424]">{value}</div>
      <div className="mt-1 text-[11px] font-bold text-[#6c6257]">{label}</div>
    </div>
  );
}

function QuickTab({ icon: Icon, label, value, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`block rounded-[18px] border p-2.5 text-center shadow-[0_10px_22px_rgba(65,42,18,0.06)] transition hover:-translate-y-0.5 ${active ? 'border-[#d82424]/25 bg-[#d82424] text-white' : 'border-black/8 bg-white/82 text-[#27231f] hover:bg-white'}`}>
      <div className={`mx-auto grid h-9 w-9 place-items-center rounded-2xl ${active ? 'bg-white/15 text-white' : 'bg-[#27231f] text-[#efbf3a]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-1.5 text-[13px] font-black">{label}</div>
      <div className={`mt-0.5 text-[11px] font-bold ${active ? 'text-white/75' : 'text-[#7b7166]'}`}>{value}</div>
    </button>
  );
}

function RecipeCard({ recipe, featured = false, onVote, voting }) {
  return (
    <div className={`group overflow-hidden rounded-[22px] border border-black/8 bg-white shadow-[0_12px_28px_rgba(65,42,18,0.08)] transition duration-300 hover:-translate-y-0.5 ${featured && recipe.photo_url ? 'sm:grid sm:grid-cols-[0.85fr,1fr]' : ''}`}>
      {recipe.photo_url ? <img src={recipe.photo_url} alt={recipe.title} className={`${featured ? 'h-32 sm:h-full' : 'h-28'} w-full object-cover`} /> : null}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {featured ? <span className="mb-2 inline-flex rounded-full bg-[#ffe1d9] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#c82120]">Featured</span> : null}
            <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-[-0.035em] text-[#27231f]">{recipe.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#6c6257]">{recipe.description}</p>
          </div>
          <button
            type="button"
            disabled={voting}
            onClick={() => onVote?.(recipe)}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ${recipe.viewer_liked ? 'bg-[#d82424] text-white' : 'bg-[#fff2ed] text-[#d82424] hover:bg-[#ffe1d9]'}`}
            aria-label="Like recipe"
          >
            <Heart className={`h-5 w-5 ${recipe.viewer_liked ? 'fill-white' : ''}`} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="rounded-full bg-[#27231f] px-2.5 py-1 text-white">{recipe.likes_count || 0} likes</span>
          {recipe.dough_style ? <span className="rounded-full bg-[#f1e5d5] px-2.5 py-1 text-[#6c6257]">{recipe.dough_style}</span> : null}
          {recipe.bake_time ? <span className="rounded-full bg-[#f1e5d5] px-2.5 py-1 text-[#6c6257]">{recipe.bake_time}</span> : null}
          <span className="rounded-full bg-[#f1e5d5] px-2.5 py-1 text-[#6c6257]">{recipe.difficulty || 'Easy'}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyBox({ children }) {
  return (
    <div className="rounded-[20px] border border-dashed border-black/12 bg-white/58 p-4 text-center text-sm font-semibold leading-6 text-[#7b7166]">
      {children}
    </div>
  );
}

export default function PublicProfile() {
  const { userId } = useParams();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [userId]);

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recipes');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', userId, user?.id],
    enabled: Boolean(userId && isSupabaseConfigured && supabase),
    queryFn: () => fetchPublicProfile(userId, user?.id),
  });

  const profile = data?.profile;
  const displayName = getPublicUsername(profile, 'Pizza friend');
  const handle = displayName.toLowerCase().replace(/\s+/g, '_');
  const recipes = data?.recipes || [];
  const featuredRecipe = recipes[0] || null;
  const bestRating = useMemo(() => [...(data?.ratings || [])].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0], [data?.ratings]);
  const socialQueryKey = ['profile-social-state', user?.id, profile?.id];
  const { data: social = { isFollowing: false, followersCount: 0, followingCount: 0 } } = useQuery({
    queryKey: socialQueryKey,
    enabled: Boolean(user?.id && profile?.id && user.id !== profile.id),
    queryFn: () => fetchProfileSocialState({ viewerId: user.id, profileId: profile.id }),
  });
  const followMutation = useMutation({
    mutationFn: () => setProfileFollow({ viewerId: user.id, profileId: profile.id, follow: !social.isFollowing }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialQueryKey }),
  });
  const voteRecipeMutation = useMutation({
    mutationFn: (recipe) => voteHomeRecipe({ userId: user.id, recipeId: recipe.id, liked: recipe.viewer_liked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public-profile', userId, user?.id] }),
  });
  const recommendedSpots = useMemo(() => {
    const map = new Map();
    if (data?.favoriteSpot) map.set(data.favoriteSpot.id, { ...data.favoriteSpot, reason: 'Favorite spot' });
    if (bestRating?.spot) map.set(bestRating.spot.id, { ...bestRating.spot, reason: `${Number(bestRating.rating).toFixed(1)} star pick` });
    (data?.createdSpots || []).slice(0, 3).forEach((spot) => map.set(spot.id, { ...spot, reason: 'Added spot' }));
    return [...map.values()].slice(0, 3);
  }, [bestRating, data?.createdSpots, data?.favoriteSpot]);
  const isOwnProfile = Boolean(user?.id && profile?.id === user.id);
  const hasTasteTags = Boolean(profile?.city || profile?.neighborhood || profile?.pizza_style || profile?.favorite_slice);

  return (
    <div className="min-h-screen bg-[#fff8ee] text-[#27231f]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(216,36,36,0.12),transparent_20%),radial-gradient(circle_at_8%_8%,rgba(94,132,62,0.10),transparent_20%),linear-gradient(180deg,#fff8ee_0%,#f4eadb_100%)]" />
      <div className="relative mx-auto max-w-5xl px-3 pb-24 pt-2 sm:px-5 sm:pb-8">
        <header className="mb-2 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/82 shadow-[0_10px_24px_rgba(65,42,18,0.10)]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="font-serif text-xl font-black">Profile</div>
          <Link to={createPageUrl('Rankings')} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/82 px-3 text-sm font-black text-[#d82424] shadow-[0_10px_24px_rgba(65,42,18,0.10)]">
            <Trophy className="h-4 w-4" />
            Ranking
          </Link>
        </header>

        {isLoading ? <div className="rounded-[28px] bg-white/80 p-8 text-center text-[#756b5f] shadow-xl">Loading profile...</div> : null}
        {!isLoading && !profile ? (
          <div className="rounded-[28px] bg-white/80 p-8 text-center text-[#756b5f] shadow-xl">
            Profile not found.
          </div>
        ) : null}

        {profile ? (
          <main className="grid gap-4">
            <section className="rounded-[28px] bg-white/76 p-3.5 shadow-[0_22px_55px_rgba(65,42,18,0.12)] backdrop-blur sm:p-4">
              <div className="grid grid-cols-[76px,1fr] gap-3 sm:grid-cols-[96px,1fr] sm:items-center">
                <div className="mx-auto h-20 w-20 rounded-full bg-[conic-gradient(from_220deg,#efbf3a,#d82424,#73994f,#efbf3a)] p-1.5 sm:h-24 sm:w-24">
                  <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[5px] border-white bg-gradient-to-br from-[#efbf3a] to-[#d82424] text-2xl font-black text-white">
                    {profile.avatar_resolved ? <img src={profile.avatar_resolved} alt={displayName} className="h-full w-full object-cover" /> : getAvatarLetter(profile, '?')}
                  </div>
                </div>

                <div className="min-w-0 min-w-0 text-left">
                  <div className="flex min-w-0 items-center justify-start gap-2">
                    <h1 className="truncate font-serif text-[clamp(1.55rem,7vw,2.35rem)] font-black leading-none tracking-[-0.055em]">{displayName}</h1>
                    <CheckCircle2 className="h-6 w-6 shrink-0 fill-[#d82424] text-white" />
                  </div>
                  <div className="mt-0.5 text-sm font-black text-[#d82424]">@{handle}</div>
                  <p className="mt-2 max-w-2xl text-sm leading-5 text-[#4c443d] sm:text-sm">
                    {profile.bio || 'No bio yet.'}
                  </p>
                  {hasTasteTags ? (
                    <div className="mt-3 flex flex-wrap justify-start gap-2">
                      {profile.city || profile.neighborhood ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9eadb] px-2.5 py-1 text-xs font-black text-[#3f4630]"><MapPin className="h-4 w-4" />{profile.city || profile.neighborhood}</span> : null}
                      {profile.pizza_style ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#675e53]">{profile.pizza_style}</span> : null}
                      {profile.favorite_slice ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#675e53]">{profile.favorite_slice}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <CompactStat value={social.followersCount || 0} label="Followers" />
                <CompactStat value={social.followingCount || 0} label="Following" />
                <CompactStat value={recipes.length} label="Recipes" />
              </div>

              <div className="mt-3 grid grid-cols-[1fr,1fr] gap-2">
                {isOwnProfile ? (
                  <Link to={createPageUrl('Profile')} className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#d82424] text-sm font-black text-white shadow-[0_14px_30px_rgba(216,36,36,0.18)]">Edit profile</Link>
                ) : user?.id ? (
                  <button
                    type="button"
                    disabled={followMutation.isPending}
                    onClick={() => followMutation.mutate()}
                    className={`h-11 rounded-[17px] text-sm font-black shadow-[0_14px_30px_rgba(216,36,36,0.18)] ${social.isFollowing ? 'bg-[#27231f] text-white' : 'bg-[#d82424] text-white'}`}
                  >
                    <span className="inline-flex items-center gap-2">{social.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{social.isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                ) : (
                  <Link to={createPageUrl('Auth')} className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#d82424] text-sm font-black text-white shadow-[0_14px_30px_rgba(216,36,36,0.18)]">Log in to follow</Link>
                )}
                <Link to={createPageUrl('Rankings')} className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-black/8 bg-white text-sm font-black shadow-[0_14px_30px_rgba(65,42,18,0.08)]">
                  <Trophy className="h-4 w-4" />
                  Recipe ranking
                </Link>
              </div>
            </section>

            <section className="grid grid-cols-4 gap-2">
              <QuickTab icon={ChefHat} label="Recipes" value={recipes.length} active={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
              <QuickTab icon={Pizza} label="Spots" value={data.createdSpots.length} active={activeTab === 'spots'} onClick={() => setActiveTab('spots')} />
              <QuickTab icon={MessageSquare} label="Reviews" value={data.comments.length} active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
              <QuickTab icon={Bookmark} label="Favorite" value={data.favoriteSpot ? 'Set' : 'None'} active={activeTab === 'spots'} onClick={() => setActiveTab('spots')} />
            </section>

            {activeTab === 'recipes' ? (
              <section id="recipes" className="rounded-[28px] bg-white/72 p-4 shadow-[0_18px_42px_rgba(65,42,18,0.10)]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="font-serif text-2xl font-black">Recipes</h2>
                  <Link to={createPageUrl('Rankings')} className="text-sm font-black text-[#d82424]">View ranking</Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {featuredRecipe ? <RecipeCard recipe={featuredRecipe} featured onVote={(recipe) => voteRecipeMutation.mutate(recipe)} voting={voteRecipeMutation.isPending} /> : null}
                  {recipes.slice(1, 5).map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} onVote={(item) => voteRecipeMutation.mutate(item)} voting={voteRecipeMutation.isPending} />
                  ))}
                  {!recipes.length ? <EmptyBox>{isOwnProfile ? 'Publish your first recipe from your profile editor.' : 'This profile has not published recipes yet.'}</EmptyBox> : null}
                </div>
              </section>
            ) : null}

            {activeTab === 'activity' ? (
              <section id="activity" className="rounded-[28px] bg-[#27231f] p-4 text-white shadow-[0_18px_42px_rgba(65,42,18,0.15)]">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 fill-[#efbf3a] text-[#efbf3a]" />
                  <h2 className="text-xl font-black tracking-[-0.04em]">Taste notes</h2>
                </div>
                <div className="grid gap-2">
                  {bestRating ? (
                    <div className="rounded-[20px] bg-white/8 p-3">
                      <div className="font-black">{Number(bestRating.rating).toFixed(1)} stars</div>
                      <div className="mt-1 line-clamp-2 text-sm text-white/60">{bestRating.spot?.name || 'Pizza spot'}</div>
                    </div>
                  ) : null}
                  {(data.comments || []).slice(0, 4).map((comment) => (
                    <div key={comment.id} className="rounded-[20px] bg-white/8 p-3">
                      <div className="font-black">{comment.spot?.name || 'Pizza spot'}</div>
                      <div className="mt-1 line-clamp-2 text-sm leading-5 text-white/60">{comment.content}</div>
                    </div>
                  ))}
                  {!bestRating && !(data.comments || []).length ? <div className="text-sm text-white/55">No public taste notes yet.</div> : null}
                </div>
              </section>
            ) : null}

            {activeTab === 'spots' ? (
              <section id="spots" className="rounded-[28px] bg-white/72 p-4 shadow-[0_18px_42px_rgba(65,42,18,0.10)]">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#d82424]" />
                  <h2 className="font-serif text-2xl font-black">Recommended spots</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recommendedSpots.map((spot) => (
                    <div key={spot.id} className="rounded-[20px] border border-black/8 bg-white p-3">
                      <div className="line-clamp-1 font-black">{spot.name}</div>
                      <div className="mt-1 text-xs font-black text-[#d82424]">{spot.reason}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-[#6c6257]">{spot.address}</div>
                    </div>
                  ))}
                  {!recommendedSpots.length ? <div className="text-sm font-semibold text-[#7b7166]">No recommendations yet.</div> : null}
                </div>
              </section>
            ) : null}
          </main>
        ) : null}
      </div>
    </div>
  );
}
