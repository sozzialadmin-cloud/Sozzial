import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Heart, MapPin, MessageSquare, Pizza, Star, Trophy, UserCheck, UserPlus, Users } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { getAvatarLetter, getPublicUsername } from '@/lib/display-name';
import { useAuth } from '@/lib/AuthContext';
import { fetchProfileSocialState, setProfileFollow } from '@/lib/social-data';

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
  if (profile?.profile_visibility === 'private') {
    return { profile: null, privateProfile: true, favoriteSpot: null, createdSpots: [], plans: [], ratings: [], comments: [] };
  }
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
    <div className="rounded-[22px] border border-black/10 bg-white/70 p-4 shadow-[0_12px_26px_rgba(34,25,11,0.06)]">
      <Icon className="h-4 w-4 text-[#df5b43]" />
      <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#141414]">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a8174]">{label}</div>
    </div>
  );
}

function ProfileFact({ icon: Icon, title, meta, children }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-[#fffaf1] p-4 shadow-[0_14px_34px_rgba(34,25,11,0.07)]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#141414] text-[#efbf3a]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="break-words text-base font-black tracking-[-0.02em] text-[#141414]">{title}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a8174]">{meta}</div>
          {children ? <div className="mt-3 text-sm leading-6 text-[#5f584d]">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function FeedItem({ title, meta, children }) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white/75 p-4">
      <div className="font-black text-[#141414]">{title}</div>
      <div className="mt-1 text-xs font-semibold text-[#8a8174]">{meta}</div>
      {children ? <div className="mt-3 text-sm leading-6 text-[#5f584d]">{children}</div> : null}
    </div>
  );
}

export default function PublicProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    enabled: Boolean(userId && isSupabaseConfigured && supabase),
    queryFn: () => fetchPublicProfile(userId),
  });

  const profile = data?.profile;
  const isPrivate = data?.privateProfile;
  const displayName = getPublicUsername(profile, 'Pizza friend');
  const handle = displayName.toLowerCase().replace(/\s+/g, '_');
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
  const recommendedSpots = useMemo(() => {
    const map = new Map();
    if (data?.favoriteSpot) map.set(data.favoriteSpot.id, { ...data.favoriteSpot, reason: 'Favorite spot' });
    if (bestRating?.spot) map.set(bestRating.spot.id, { ...bestRating.spot, reason: `${Number(bestRating.rating).toFixed(1)} star pick` });
    (data?.createdSpots || []).slice(0, 4).forEach((spot) => map.set(spot.id, { ...spot, reason: 'Added by this profile' }));
    return [...map.values()].slice(0, 4);
  }, [bestRating, data?.createdSpots, data?.favoriteSpot]);

  return (
    <div className="min-h-screen bg-[#f4efe6] px-3 py-4 text-[#141414] sm:px-4 sm:py-5">
      <div className="mx-auto max-w-5xl">
        <Link to={createPageUrl('Home')} className="mb-4 inline-flex h-11 items-center gap-2 rounded-2xl border border-black/10 bg-[#fffaf1] px-4 text-sm font-black text-[#141414] shadow-[0_12px_28px_rgba(34,25,11,0.08)]">
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        {isLoading ? <div className="rounded-[30px] border border-black/10 bg-[#fffaf1] p-8 text-center text-[#6d665b]">Loading profile...</div> : null}
        {!isLoading && !profile ? (
          <div className="rounded-[30px] border border-black/10 bg-[#fffaf1] p-8 text-center text-[#6d665b]">
            {isPrivate ? 'This profile is private.' : 'Profile not found.'}
          </div>
        ) : null}

        {profile ? (
          <div className="grid gap-5 lg:grid-cols-[0.92fr,1.08fr]">
            <section className="overflow-hidden rounded-[32px] border border-black/10 bg-[#fffaf1] shadow-[0_28px_70px_rgba(34,25,11,0.12)]">
              <div className="relative bg-[#141414] px-5 pb-6 pt-5 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(239,191,58,0.28),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(223,91,67,0.26),transparent_30%)]" />
                <div className="relative">
                  <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-[28px] border-2 border-white/18 bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-3xl font-black shadow-[0_18px_38px_rgba(0,0,0,0.24)]">
                    {profile.avatar_resolved ? <img src={profile.avatar_resolved} alt={displayName} className="h-full w-full object-cover" /> : getAvatarLetter(profile, '?')}
                  </div>
                  <h1 className="mt-5 break-words text-[clamp(2rem,10vw,3.25rem)] font-black leading-none tracking-[-0.07em]">{displayName}</h1>
                  <div className="mt-2 text-sm font-semibold text-white/58">@{handle}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.city ? <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black text-white">{profile.city}</span> : null}
                    {profile.neighborhood ? <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black text-white">{profile.neighborhood}</span> : null}
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black text-white">{social.followersCount} followers</span>
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black text-white">{social.followingCount} following</span>
                  </div>
                  {user?.id && profile.id !== user.id ? (
                    <button
                      type="button"
                      disabled={followMutation.isPending}
                      onClick={() => followMutation.mutate()}
                      className={`mt-5 inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${social.isFollowing ? 'border border-white/14 bg-white/10 text-white' : 'bg-[#efbf3a] text-[#141414] hover:bg-[#f2c94c]'}`}
                    >
                      {social.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      {social.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="p-5">
                <p className="rounded-[24px] border border-black/8 bg-white/65 p-4 text-sm leading-7 text-[#4f473d]">
                  {profile.bio || 'This person has not added a bio yet.'}
                </p>

                <div className="mt-4 grid gap-3">
                  <ProfileFact icon={Heart} title={profile.favorite_slice || 'Not set'} meta="Favorite slice">Personal pick</ProfileFact>
                  <ProfileFact icon={MapPin} title={data.favoriteSpot?.name || 'Not set'} meta="Favorite spot">{data.favoriteSpot?.address || 'No favorite place yet.'}</ProfileFact>
                  <ProfileFact icon={Pizza} title={profile.pizza_style || 'Not set'} meta="Pizza style" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat icon={Pizza} label="Spots" value={data.createdSpots.length} />
                  <Stat icon={CalendarDays} label="Plans" value={data.plans.length} />
                  <Stat icon={Star} label="Ratings" value={data.ratings.length} />
                  <Stat icon={MessageSquare} label="Reviews" value={data.comments.length} />
                </div>

                <div className="mt-4 rounded-[26px] border border-black/10 bg-white/70 p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[#df5b43]" />
                    <div className="font-black tracking-[-0.02em]">Taste summary</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#141414] px-3 py-1 text-xs font-black text-white">{profile.favorite_slice || 'Slice explorer'}</span>
                    <span className="rounded-full bg-[#f2e4d0] px-3 py-1 text-xs font-black text-[#5f584d]">{profile.pizza_style || 'Open taste'}</span>
                    <span className="rounded-full bg-[#f2e4d0] px-3 py-1 text-xs font-black text-[#5f584d]">{data.comments.length} public reviews</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[32px] border border-black/10 bg-[#141414] p-5 text-white shadow-[0_24px_58px_rgba(34,25,11,0.13)]">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#efbf3a]" />
                  <div className="text-2xl font-black tracking-[-0.04em]">Recommended by {displayName}</div>
                </div>
                <div className="grid gap-3">
                  {recommendedSpots.map((spot) => (
                    <div key={spot.id} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
                      <div className="font-black">{spot.name}</div>
                      <div className="mt-1 text-xs font-semibold text-[#efbf3a]">{spot.reason}</div>
                      <div className="mt-2 line-clamp-2 text-sm text-white/55">{spot.address}</div>
                    </div>
                  ))}
                  {!recommendedSpots.length ? <div className="rounded-[24px] border border-dashed border-white/12 p-8 text-center text-sm text-white/55">No recommendations yet.</div> : null}
                </div>
              </div>
              <div className="rounded-[32px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_24px_58px_rgba(34,25,11,0.10)]">
                <div className="mb-4">
                  <div className="text-2xl font-black tracking-[-0.04em]">Pizza activity</div>
                  <div className="mt-1 text-sm text-[#7a7165]">Public reviews, ratings and spots from this profile.</div>
                </div>
                <div className="grid gap-3">
                  {bestRating ? <FeedItem title={`${Number(bestRating.rating).toFixed(1)} stars at ${bestRating.spot?.name || 'Pizza spot'}`} meta="Top recent rating">{bestRating.spot?.address || ''}</FeedItem> : null}
                  {data.comments.slice(0, 5).map((comment) => <FeedItem key={comment.id} title={comment.spot?.name || 'Pizza spot'} meta="Review">{comment.content}</FeedItem>)}
                  {data.createdSpots.slice(0, 5).map((spot) => <FeedItem key={spot.id} title={spot.name} meta="Added spot">{spot.address}</FeedItem>)}
                  {!data.comments.length && !data.createdSpots.length && !bestRating ? <div className="rounded-[24px] border border-dashed border-black/12 bg-white/55 p-8 text-center text-sm text-[#7a7165]">No public activity yet.</div> : null}
                </div>
              </div>

              <div className="rounded-[32px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_24px_58px_rgba(34,25,11,0.10)]">
                <div className="mb-4 text-2xl font-black tracking-[-0.04em]">Upcoming public plans</div>
                <div className="grid gap-3">
                  {data.plans.map((plan) => (
                    <FeedItem key={plan.id} title={plan.title} meta={`${plan.plan_date} ${String(plan.plan_time || '').slice(0, 5)}`} />
                  ))}
                  {!data.plans.length ? <div className="rounded-[24px] border border-dashed border-black/12 bg-white/55 p-8 text-center text-sm text-[#7a7165]">No public active plans.</div> : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}