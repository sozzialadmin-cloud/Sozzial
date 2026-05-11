import React, { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, Bookmark, CalendarDays, CheckCircle2, ChefHat, Flame, Heart, MapPin, MessageCircle, MessageSquare, MoreVertical, Pizza, Send, Star, ThumbsUp, Trophy, UserCheck, UserPlus, Users } from 'lucide-react';
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
  if (profile?.profile_visibility === 'private') {
    return { profile: null, privateProfile: true, favoriteSpot: null, createdSpots: [], plans: [], ratings: [], comments: [], recipes: [] };
  }

  const resolvedId = profile?.id || userId;
  const [plansRes, ratingsRes, commentsRes, recipes] = profile
    ? await Promise.all([
        supabase.from('plans').select('id,title,plan_date,plan_time,status,created_by').eq('created_by', resolvedId).eq('status', 'active').order('plan_date', { ascending: true }).limit(12),
        supabase.from('spot_ratings').select('id,spot_id,rating,updated_at').eq('user_id', resolvedId).order('updated_at', { ascending: false }).limit(20),
        supabase.from('spot_comments').select('id,spot_id,content,status,created_at').eq('user_id', resolvedId).order('created_at', { ascending: false }).limit(20),
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

function StatPill({ value, label }) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-[clamp(1.35rem,5vw,2rem)] font-black leading-none tracking-[-0.05em] text-[#c82120]">{value}</div>
      <div className="mt-1 text-xs font-semibold text-[#3d362f] sm:text-sm">{label}</div>
    </div>
  );
}

function Highlight({ icon: Icon, label, tone, image }) {
  return (
    <div className="group min-w-[82px] text-center">
      <div className="relative mx-auto grid h-[76px] w-[76px] place-items-center rounded-full bg-white shadow-[0_14px_30px_rgba(65,42,18,0.12)] ring-2 ring-white transition duration-300 group-hover:-translate-y-1 sm:h-[88px] sm:w-[88px]">
        <div className={`absolute inset-1 rounded-full ${image}`} />
        <div className={`absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full text-white shadow-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-sm font-black text-[#27231f]">{label}</div>
    </div>
  );
}

function FeaturedRecipe({ recipe, fallbackTitle, onVote, voting }) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(65,42,18,0.13)] sm:grid sm:grid-cols-[1.35fr,0.95fr]">
      <div className="min-h-[190px] bg-[radial-gradient(circle_at_25%_22%,rgba(255,255,255,0.92),transparent_13%),radial-gradient(circle_at_70%_34%,rgba(112,59,25,0.35),transparent_12%),radial-gradient(circle_at_38%_72%,rgba(29,116,64,0.55),transparent_8%),radial-gradient(circle_at_62%_66%,rgba(225,38,32,0.52),transparent_9%),linear-gradient(135deg,#f6c169,#b64b24_45%,#3b1e12)] sm:min-h-[250px]" />
      <div className="flex flex-col justify-between p-5 sm:p-6">
        <div>
          <span className="inline-flex rounded-full bg-[#ffe1d9] px-3 py-1 text-xs font-black text-[#c82120]">Featured</span>
          <h2 className="mt-4 text-3xl font-black leading-none tracking-[-0.055em] text-[#27231f]">{recipe?.title || fallbackTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#695f54]">{recipe?.description || 'A simple, aromatic pizza idea ready to become this profile favorite.'}</p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!recipe?.id || voting}
            onClick={() => recipe?.id && onVote?.(recipe)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${recipe?.viewer_liked ? 'bg-[#c82120] text-white' : 'bg-[#fff4ef] text-[#c82120] hover:bg-[#ffe2d8]'}`}
          >
            <Heart className={`h-5 w-5 ${recipe?.viewer_liked ? 'fill-white' : ''}`} />
            {recipe?.likes_count || 0}
          </button>
          <Bookmark className="h-7 w-7 text-[#5f7d3d]" />
        </div>
      </div>
    </div>
  );
}

function RecipeTile({ recipe, index, onVote, voting }) {
  return (
    <div className="group overflow-hidden rounded-[22px] bg-white shadow-[0_18px_42px_rgba(65,42,18,0.12)] transition duration-300 hover:-translate-y-1">
      <div className={`relative h-36 ${index % 3 === 0 ? 'bg-[radial-gradient(circle_at_35%_35%,#fff7d9_0_9%,transparent_10%),radial-gradient(circle_at_62%_55%,#d82024_0_8%,transparent_9%),radial-gradient(circle_at_72%_30%,#236b35_0_6%,transparent_7%),linear-gradient(135deg,#f4c46b,#9d3c20)]' : index % 3 === 1 ? 'bg-[radial-gradient(circle_at_40%_48%,#f8f3df_0_18%,transparent_19%),radial-gradient(circle_at_70%_36%,#4a2a18_0_8%,transparent_9%),linear-gradient(135deg,#e9d3aa,#6d4528)]' : 'bg-[radial-gradient(circle_at_30%_30%,#efc0a2_0_12%,transparent_13%),radial-gradient(circle_at_70%_55%,#101010_0_6%,transparent_7%),linear-gradient(135deg,#e85e32,#f3c765)]'}`}>
        <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-black text-white">{recipe.bake_time || `${index + 1}h`}</span>
        <button
          type="button"
          disabled={voting}
          onClick={() => onVote?.(recipe)}
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/18 text-white backdrop-blur-md transition hover:bg-white/28"
          aria-label="Like recipe"
        >
          <Heart className={`h-5 w-5 ${recipe.viewer_liked ? 'fill-white' : ''}`} />
        </button>
      </div>
      <div className="p-4">
        <div className="line-clamp-1 text-lg font-black tracking-[-0.03em] text-[#27231f]">{recipe.title}</div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#756b5f]">{recipe.description}</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 font-black text-[#c82120]"><Heart className="h-4 w-4 fill-[#c82120]" />{recipe.likes_count || 0}</span>
          <span className="inline-flex items-center gap-1 text-[#3d362f]"><MessageCircle className="h-4 w-4" />{Math.max(1, index + 3)}</span>
          <MoreVertical className="h-4 w-4 text-[#756b5f]" />
        </div>
      </div>
    </div>
  );
}

function MiniRecommendation({ spot, index }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_16px_34px_rgba(65,42,18,0.08)]">
      <div className={`h-24 ${index % 2 ? 'bg-[linear-gradient(135deg,#16110c,#81502d_55%,#efbf3a)]' : 'bg-[linear-gradient(135deg,#efe4d2,#c82120_58%,#302016)]'}`} />
      <div className="p-4">
        <div className="line-clamp-1 font-black text-[#27231f]">{spot.name}</div>
        <div className="mt-1 text-xs font-bold text-[#c82120]">{spot.reason}</div>
        <div className="mt-2 line-clamp-2 text-sm leading-5 text-[#756b5f]">{spot.address}</div>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { userId } = useParams();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [userId]);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', userId, user?.id],
    enabled: Boolean(userId && isSupabaseConfigured && supabase),
    queryFn: () => fetchPublicProfile(userId, user?.id),
  });

  const profile = data?.profile;
  const isPrivate = data?.privateProfile;
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
    (data?.createdSpots || []).slice(0, 4).forEach((spot) => map.set(spot.id, { ...spot, reason: 'Added by this profile' }));
    return [...map.values()].slice(0, 4);
  }, [bestRating, data?.createdSpots, data?.favoriteSpot]);

  return (
    <div className="min-h-screen bg-[#fffaf2] text-[#27231f]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_92%_4%,rgba(200,33,32,0.16),transparent_18%),radial-gradient(circle_at_8%_14%,rgba(84,126,61,0.12),transparent_18%),linear-gradient(180deg,#fffaf2_0%,#f5eadb_100%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-12">
        <div className="mb-5 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 text-[#141414] shadow-[0_12px_30px_rgba(65,42,18,0.10)] backdrop-blur">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="text-center">
            <div className="font-serif text-3xl font-black">Profile</div>
            <div className="mx-auto mt-1 h-px w-28 bg-gradient-to-r from-transparent via-[#d8ad7a] to-transparent" />
          </div>
          <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 text-[#141414] shadow-[0_12px_30px_rgba(65,42,18,0.10)] backdrop-blur">
            <Bell className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? <div className="rounded-[34px] bg-white/80 p-10 text-center text-[#756b5f] shadow-xl">Loading profile...</div> : null}
        {!isLoading && !profile ? (
          <div className="rounded-[34px] bg-white/80 p-10 text-center text-[#756b5f] shadow-xl">
            {isPrivate ? 'This profile is private.' : 'Profile not found.'}
          </div>
        ) : null}

        {profile ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[300px,1fr] lg:items-center">
              <div className="mx-auto h-[252px] w-[252px] rounded-full bg-[conic-gradient(from_220deg,#efbf3a,#d82024,#8aa66b,#efbf3a)] p-1.5 shadow-[0_28px_65px_rgba(65,42,18,0.16)] sm:h-[286px] sm:w-[286px]">
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[8px] border-white bg-gradient-to-br from-[#efbf3a] to-[#c82120] text-7xl font-black text-white">
                  {profile.avatar_resolved ? <img src={profile.avatar_resolved} alt={displayName} className="h-full w-full object-cover" /> : getAvatarLetter(profile, '?')}
                </div>
              </div>

              <div className="text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <h1 className="font-serif text-[clamp(2.8rem,9vw,5.2rem)] font-black leading-none tracking-[-0.055em]">{displayName}</h1>
                  <Pizza className="h-9 w-9 text-[#efbf3a]" />
                  <CheckCircle2 className="h-8 w-8 fill-[#ed5b58] text-white" />
                </div>
                <div className="mt-2 text-2xl font-black text-[#c82120]">@{handle}</div>
                <p className="mx-auto mt-5 max-w-2xl text-xl leading-9 text-[#302c28] lg:mx-0">
                  {profile.bio || `Pizza lover, slice hunter and home recipe explorer. ${profile.favorite_slice ? `Favorite slice: ${profile.favorite_slice}.` : ''}`}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#e9eadb] px-4 py-2 text-base font-black text-[#3f4630]"><MapPin className="h-5 w-5" />{profile.city || 'Pizza city'}</span>
                  <span className="rounded-full bg-white/75 px-4 py-2 text-base font-black text-[#675e53]">{profile.pizza_style || 'Home recipes'}</span>
                  <span className="rounded-full bg-white/75 px-4 py-2 text-base font-black text-[#675e53]">{profile.favorite_slice || 'Artisan slices'}</span>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-[30px] bg-white/88 p-5 shadow-[0_20px_50px_rgba(65,42,18,0.12)] backdrop-blur">
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-[1fr,1fr,1fr,1.55fr] sm:items-center">
                <StatPill value={social.followersCount || 0} label="Followers" />
                <StatPill value={social.followingCount || 0} label="Following" />
                <StatPill value={recipes.length} label="Recipes" />
                <div className="col-span-3 flex items-center justify-center gap-3 border-t border-black/10 pt-4 sm:col-span-1 sm:justify-start sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div className="flex -space-x-3">
                    {[0, 1, 2].map((item) => <div key={item} className="h-11 w-11 rounded-full border-2 border-white bg-[linear-gradient(135deg,#2a2119,#efbf3a)]" />)}
                  </div>
                  <div className="text-sm leading-5 text-[#756b5f]">Followed by pizza people nearby</div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid grid-cols-[1fr,1fr,64px] gap-3">
              {user?.id && profile.id !== user.id ? (
                <button
                  type="button"
                  disabled={followMutation.isPending}
                  onClick={() => followMutation.mutate()}
                  className={`h-16 rounded-[24px] text-lg font-black shadow-[0_16px_38px_rgba(200,33,32,0.18)] transition hover:-translate-y-0.5 ${social.isFollowing ? 'bg-[#27231f] text-white' : 'bg-[#d82626] text-white'}`}
                >
                  <span className="inline-flex items-center gap-2">{social.isFollowing ? <UserCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}{social.isFollowing ? 'Following' : 'Follow'}</span>
                </button>
              ) : (
                <Link to={createPageUrl('Profile')} className="inline-flex h-16 items-center justify-center rounded-[24px] bg-[#d82626] text-lg font-black text-white shadow-[0_16px_38px_rgba(200,33,32,0.18)]">Edit profile</Link>
              )}
              <button className="h-16 rounded-[24px] border border-black/10 bg-white/82 text-lg font-black shadow-[0_16px_36px_rgba(65,42,18,0.10)]">
                <span className="inline-flex items-center gap-2"><Send className="h-5 w-5" />Message</span>
              </button>
              <button className="grid h-16 place-items-center rounded-[24px] border border-black/10 bg-white/82 shadow-[0_16px_36px_rgba(65,42,18,0.10)]">
                <Bell className="h-6 w-6" />
              </button>
            </section>

            <section className="mt-6 grid grid-cols-4 gap-4 rounded-[30px] bg-white/86 p-4 shadow-[0_18px_44px_rgba(65,42,18,0.10)]">
              <Highlight icon={ChefHat} label="Recipes" tone="bg-[#d82626]" image="bg-[radial-gradient(circle_at_45%_42%,#fff4d8_0_18%,transparent_19%),radial-gradient(circle_at_68%_50%,#2f7d3c_0_8%,transparent_9%),linear-gradient(135deg,#f1b14f,#c93b24)]" />
              <Highlight icon={MapPin} label="Pizzerias" tone="bg-[#6d8d42]" image="bg-[linear-gradient(135deg,#271f18,#8b5530_58%,#f2c06a)]" />
              <Highlight icon={Flame} label="Tips" tone="bg-[#eba51c]" image="bg-[radial-gradient(circle_at_50%_45%,#f5efe2_0_28%,transparent_29%),linear-gradient(135deg,#d9b98d,#7e5234)]" />
              <Highlight icon={Heart} label="Favorites" tone="bg-[#d82626]" image="bg-[radial-gradient(circle_at_45%_42%,#f6e9bd_0_15%,transparent_16%),radial-gradient(circle_at_68%_38%,#b82424_0_10%,transparent_11%),linear-gradient(135deg,#f2bc55,#8a2f1d)]" />
            </section>

            <section className="mt-6">
              <FeaturedRecipe recipe={featuredRecipe} fallbackTitle={profile.favorite_slice || 'Margherita with sourdough'} onVote={(recipe) => voteRecipeMutation.mutate(recipe)} voting={voteRecipeMutation.isPending} />
            </section>

            <section className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-3xl font-black">Latest recipes</h2>
                <Link to={createPageUrl('Rankings')} className="text-base font-black text-[#c82120]">View ranking</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {recipes.slice(1, 5).map((recipe, index) => (
                  <RecipeTile key={recipe.id} recipe={recipe} index={index} onVote={(item) => voteRecipeMutation.mutate(item)} voting={voteRecipeMutation.isPending} />
                ))}
                {!recipes.slice(1, 5).length ? (
                  <div className="rounded-[28px] border border-dashed border-black/12 bg-white/65 p-8 text-center text-[#756b5f] sm:col-span-2">No more recipes yet.</div>
                ) : null}
              </div>
            </section>

            <section className="mt-8 grid gap-5 lg:grid-cols-[1fr,0.9fr]">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#c82120]" />
                  <h2 className="font-serif text-3xl font-black">Recommended spots</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommendedSpots.map((spot, index) => <MiniRecommendation key={spot.id} spot={spot} index={index} />)}
                  {!recommendedSpots.length ? <div className="rounded-[28px] border border-dashed border-black/12 bg-white/65 p-8 text-center text-[#756b5f] sm:col-span-2">No recommendations yet.</div> : null}
                </div>
              </div>

              <div className="rounded-[30px] bg-[#27231f] p-5 text-white shadow-[0_22px_55px_rgba(65,42,18,0.16)]">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#efbf3a]" />
                  <h2 className="text-2xl font-black tracking-[-0.04em]">Pizza activity</h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {bestRating ? (
                    <div className="rounded-[22px] bg-white/8 p-4">
                      <div className="font-black">{Number(bestRating.rating).toFixed(1)} stars at {bestRating.spot?.name || 'Pizza spot'}</div>
                      <div className="mt-1 text-sm text-white/55">{bestRating.spot?.address || ''}</div>
                    </div>
                  ) : null}
                  {(data?.comments || []).slice(0, 3).map((comment) => (
                    <div key={comment.id} className="rounded-[22px] bg-white/8 p-4">
                      <div className="font-black">{comment.spot?.name || 'Pizza spot'}</div>
                      <div className="mt-2 text-sm leading-6 text-white/65">{comment.content}</div>
                    </div>
                  ))}
                  {!(data?.comments || []).length && !bestRating ? <div className="rounded-[22px] border border-dashed border-white/14 p-8 text-center text-sm text-white/55">No public activity yet.</div> : null}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
