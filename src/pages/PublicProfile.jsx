import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Heart, MapPin, MessageSquare, Pizza, Star } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { getAvatarLetter, getPublicUsername } from '@/lib/display-name';

async function resolveAvatar(value) {
  if (!value || !isSupabaseConfigured || !supabase) return '';
  if (String(value).startsWith('http')) return value;
  const { data } = await supabase.storage.from('avatars').createSignedUrl(value, 60 * 60);
  return data?.signedUrl || '';
}

async function fetchPublicProfile(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
  const profileQuery = looksLikeUuid
    ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    : supabase.from('profiles').select('*').ilike('username', userId).limit(1).maybeSingle();
  const [profileRes, spotsRes, plansRes, ratingsRes, commentsRes] = await Promise.all([
    profileQuery,
    supabase.from('spots').select('id,name,address,best_slice,slice_price,average_rating,status,created_by').limit(250),
    Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] }),
  ]);
  if (profileRes.error) throw profileRes.error;
  const profile = profileRes.data || null;
  const resolvedId = profile?.id || userId;
  const [plansRes2, ratingsRes2, commentsRes2] = profile
    ? await Promise.all([
        supabase.from('plans').select('id,title,plan_date,plan_time,status,created_by').eq('created_by', resolvedId).eq('status', 'active').order('plan_date', { ascending: true }).limit(12),
        supabase.from('spot_ratings').select('id,spot_id,rating,updated_at').eq('user_id', resolvedId).order('updated_at', { ascending: false }).limit(20),
        supabase.from('spot_comments').select('id,spot_id,content,status,created_at').eq('user_id', resolvedId).order('created_at', { ascending: false }).limit(20),
      ])
    : [plansRes, ratingsRes, commentsRes];
  const spots = spotsRes.error ? [] : spotsRes.data || [];
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  return {
    profile: profile ? { ...profile, avatar_resolved: await resolveAvatar(profile.avatar_url) } : null,
    favoriteSpot: spots.find((spot) => spot.id === profile?.favorite_spot_id) || null,
    createdSpots: spots.filter((spot) => spot.created_by === resolvedId && spot.status === 'approved'),
    plans: plansRes2.error ? [] : plansRes2.data || [],
    ratings: (ratingsRes2.error ? [] : ratingsRes2.data || []).map((rating) => ({ ...rating, spot: spotMap.get(rating.spot_id) || null })),
    comments: (commentsRes2.error ? [] : commentsRes2.data || []).filter((comment) => comment.status === 'approved').map((comment) => ({ ...comment, spot: spotMap.get(comment.spot_id) || null })),
  };
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-4 w-4 text-[#efbf3a]" />
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</div>
    </div>
  );
}

function FeedItem({ title, meta, children }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
      <div className="font-black text-white">{title}</div>
      <div className="mt-1 text-xs text-stone-500">{meta}</div>
      {children ? <div className="mt-3 text-sm leading-6 text-stone-300">{children}</div> : null}
    </div>
  );
}

export default function PublicProfile() {
  const { userId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    enabled: Boolean(userId && isSupabaseConfigured && supabase),
    queryFn: () => fetchPublicProfile(userId),
  });

  const profile = data?.profile;
  const displayName = getPublicUsername(profile, 'Pizza friend');
  const handle = displayName.toLowerCase().replace(/\s+/g, '_');
  const bestRating = useMemo(() => [...(data?.ratings || [])].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0], [data?.ratings]);

  return (
    <div className="min-h-screen bg-[#060606] px-3 py-4 text-white sm:px-4 sm:py-5">
      <div className="mx-auto max-w-5xl">
        <Link to={createPageUrl('Home')} className="mb-4 inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-stone-200">
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        {isLoading ? <div className="rounded-[30px] border border-white/10 bg-[#101010] p-8 text-center text-stone-400">Loading profile...</div> : null}
        {!isLoading && !profile ? <div className="rounded-[30px] border border-white/10 bg-[#101010] p-8 text-center text-stone-400">Profile not found.</div> : null}

        {profile ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-[26px] border border-white/10 bg-[#101010] p-4 sm:rounded-[30px] sm:p-5">
              <div className="flex flex-col gap-4 min-[380px]:flex-row min-[380px]:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-3xl font-black sm:h-24 sm:w-24 sm:rounded-[28px]">
                  {profile.avatar_resolved ? <img src={profile.avatar_resolved} alt={displayName} className="h-full w-full object-cover" /> : getAvatarLetter(profile, '?')}
                </div>
                <div className="min-w-0">
                  <h1 className="break-words text-[clamp(1.85rem,10vw,2.4rem)] font-black leading-none tracking-tight">{displayName}</h1>
                  <div className="mt-2 text-sm text-stone-500">@{handle}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.city ? <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-stone-300">{profile.city}</span> : null}
                    {profile.neighborhood ? <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-stone-300">{profile.neighborhood}</span> : null}
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm leading-7 text-stone-300">{profile.bio || 'This person has not added a bio yet.'}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FeedItem title={profile.favorite_slice || 'Not set'} meta="Favorite slice">
                  <Heart className="inline h-4 w-4 text-[#efbf3a]" /> personal pick
                </FeedItem>
                <FeedItem title={data.favoriteSpot?.name || 'Not set'} meta="Favorite spot">
                  {data.favoriteSpot?.address || 'No favorite place yet.'}
                </FeedItem>
                <FeedItem title={profile.pizza_style || 'Not set'} meta="Pizza style" />
                <FeedItem title={profile.dietary_notes || 'Not set'} meta="Dietary notes" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
                <Stat icon={Pizza} label="Spots" value={data.createdSpots.length} />
                <Stat icon={CalendarDays} label="Plans" value={data.plans.length} />
                <Stat icon={Star} label="Ratings" value={data.ratings.length} />
                <Stat icon={MessageSquare} label="Reviews" value={data.comments.length} />
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
                <div className="mb-4 text-xl font-black">Pizza activity</div>
                <div className="grid gap-3">
                  {bestRating ? <FeedItem title={`${Number(bestRating.rating).toFixed(1)} stars at ${bestRating.spot?.name || 'Pizza spot'}`} meta="Top recent rating">{bestRating.spot?.address || ''}</FeedItem> : null}
                  {data.comments.slice(0, 5).map((comment) => <FeedItem key={comment.id} title={comment.spot?.name || 'Pizza spot'} meta="Review">{comment.content}</FeedItem>)}
                  {data.createdSpots.slice(0, 5).map((spot) => <FeedItem key={spot.id} title={spot.name} meta="Added spot">{spot.address}</FeedItem>)}
                  {!data.comments.length && !data.createdSpots.length && !bestRating ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">No public activity yet.</div> : null}
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
                <div className="mb-4 text-xl font-black">Upcoming public plans</div>
                <div className="grid gap-3">
                  {data.plans.map((plan) => (
                    <FeedItem key={plan.id} title={plan.title} meta={`${plan.plan_date} ${String(plan.plan_time || '').slice(0, 5)}`} />
                  ))}
                  {!data.plans.length ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">No public active plans.</div> : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
