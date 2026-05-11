import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, CalendarDays, ChefHat, Flame, Heart, LogOut, MapPin, MessageSquare, Pizza, Plus, Settings, Shield, Star, ThumbsUp, Upload, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createHomeRecipe, fetchProfileRecipes, fetchRecipeRankings, voteHomeRecipe } from '@/lib/social-data';

async function resolveAvatar(value) {
  if (!value || !isSupabaseConfigured || !supabase) return '';
  if (String(value).startsWith('http')) return value;
  const bucket = supabase.storage.from('avatars');
  const { data: signed } = await bucket.createSignedUrl(value, 60 * 60);
  if (signed?.signedUrl) return signed.signedUrl;
  const { data: publicData } = bucket.getPublicUrl(value);
  return publicData?.publicUrl || '';
}

async function fetchProfileBundle(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  const [profileRes, spotsRes, plansRes, ratingsRes, commentsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('spots').select('id,name,address,best_slice,slice_price,average_rating,status,created_by').order('name', { ascending: true }).limit(250),
    supabase.from('plans').select('id,title,plan_date,plan_time,status,created_by').eq('created_by', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('spot_ratings').select('id,spot_id,rating,created_at,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20),
    supabase.from('spot_comments').select('id,spot_id,content,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  ]);

  if (profileRes.error) throw profileRes.error;
  const spots = spotsRes.error ? [] : spotsRes.data || [];
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));

  return {
    profile: profileRes.data || null,
    spots,
    createdSpots: spots.filter((spot) => spot.created_by === userId),
    plans: plansRes.error ? [] : plansRes.data || [],
    ratings: (ratingsRes.error ? [] : ratingsRes.data || []).map((rating) => ({ ...rating, spot: spotMap.get(rating.spot_id) || null })),
    comments: (commentsRes.error ? [] : commentsRes.data || []).map((comment) => ({ ...comment, spot: spotMap.get(comment.spot_id) || null })),
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

function ActivityItem({ title, meta, children }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.035] px-4 py-3">
      <div className="font-bold text-white">{title}</div>
      <div className="mt-1 text-xs text-stone-500">{meta}</div>
      {children ? <div className="mt-2 text-sm leading-6 text-stone-300">{children}</div> : null}
    </div>
  );
}


function RecipeCard({ recipe, rank, onVote, voting }) {
  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#efbf3a]/35 hover:bg-white/[0.08]">
      <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#efbf3a]/10 blur-2xl transition duration-500 group-hover:bg-[#efbf3a]/20" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#efbf3a]/20 bg-[#efbf3a]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#efbf3a]">
            <Flame className="h-3 w-3" />
            {rank ? `#${rank} recipe` : recipe.difficulty || 'Easy'}
          </div>
          <div className="break-words text-lg font-black leading-tight text-white">{recipe.title}</div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-400">{recipe.description}</p>
        </div>
        <button
          type="button"
          disabled={voting}
          onClick={() => onVote?.(recipe)}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition ${recipe.viewer_liked ? 'border-[#efbf3a]/30 bg-[#efbf3a] text-[#141414]' : 'border-white/10 bg-black/25 text-white hover:bg-white/10'}`}
          aria-label="Vote recipe"
        >
          <ThumbsUp className="h-5 w-5" />
        </button>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.likes_count || 0} likes</span>
        {recipe.dough_style ? <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.dough_style}</span> : null}
        {recipe.bake_time ? <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.bake_time}</span> : null}
      </div>
    </div>
  );
}
export default function Profile() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  const { user, profile, role, refreshProfile, logout } = useAuth();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ title: '', description: '', doughStyle: '', difficulty: 'Easy', bakeTime: '' });
  const [form, setForm] = useState({
    username: '',
    bio: '',
    city: '',
    neighborhood: '',
    favorite_slice: '',
    favorite_spot_id: '',
    pizza_style: '',
    dietary_notes: '',
    instagram_url: '',
    website_url: '',
    profile_visibility: 'public',
  });

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['profile-bundle', user?.id],
    enabled: Boolean(user?.id && isSupabaseConfigured && supabase),
    queryFn: () => fetchProfileBundle(user.id),
  });


  const { data: recipes = [] } = useQuery({
    queryKey: ['profile-recipes', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchProfileRecipes(user.id, user.id),
  });

  const { data: recipeRankings = [] } = useQuery({
    queryKey: ['recipe-rankings', user?.id],
    queryFn: () => fetchRecipeRankings(user?.id),
  });

  const createRecipeMutation = useMutation({
    mutationFn: () => createHomeRecipe({ userId: user.id, ...recipeForm }),
    onSuccess: () => {
      toast.success('Recipe published');
      setRecipeForm({ title: '', description: '', doughStyle: '', difficulty: 'Easy', bakeTime: '' });
      queryClient.invalidateQueries({ queryKey: ['profile-recipes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-rankings'] });
    },
    onError: (error) => toast.error(error?.message || 'Recipe could not be published.'),
  });

  const voteRecipeMutation = useMutation({
    mutationFn: (recipe) => voteHomeRecipe({ userId: user.id, recipeId: recipe.id, liked: recipe.viewer_liked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-recipes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-rankings'] });
    },
    onError: (error) => toast.error(error?.message || 'Could not vote this recipe.'),
  });
  const liveProfile = bundle?.profile || profile || user || {};
  const displayName = liveProfile.username || user?.username || user?.full_name || 'User';
  const handle = displayName.toLowerCase().replace(/\s+/g, '_');
  const favoriteSpot = useMemo(
    () => (bundle?.spots || []).find((spot) => spot.id === form.favorite_spot_id || spot.id === liveProfile.favorite_spot_id),
    [bundle?.spots, form.favorite_spot_id, liveProfile.favorite_spot_id],
  );
  const profileChecklist = useMemo(() => [
    { label: 'Add avatar', done: Boolean(liveProfile.avatar_url || user?.avatar_url) },
    { label: 'Write bio', done: Boolean(liveProfile.bio) },
    { label: 'Choose city', done: Boolean(liveProfile.city) },
    { label: 'Add favorite slice', done: Boolean(liveProfile.favorite_slice) },
    { label: 'Pick favorite spot', done: Boolean(liveProfile.favorite_spot_id) },
  ], [liveProfile.avatar_url, liveProfile.bio, liveProfile.city, liveProfile.favorite_slice, liveProfile.favorite_spot_id, user?.avatar_url]);
  const profileProgress = Math.round((profileChecklist.filter((item) => item.done).length / profileChecklist.length) * 100);

  useEffect(() => {
    resolveAvatar(liveProfile.avatar_url || user?.avatar_url).then(setAvatarPreview);
  }, [liveProfile.avatar_url, user?.avatar_url]);

  useEffect(() => {
    setForm({
      username: liveProfile.username || '',
      bio: liveProfile.bio || '',
      city: liveProfile.city || '',
      neighborhood: liveProfile.neighborhood || '',
      favorite_slice: liveProfile.favorite_slice || '',
      favorite_spot_id: liveProfile.favorite_spot_id || '',
      pizza_style: liveProfile.pizza_style || '',
      dietary_notes: liveProfile.dietary_notes || '',
      instagram_url: liveProfile.instagram_url || '',
      website_url: liveProfile.website_url || '',
      profile_visibility: liveProfile.profile_visibility || 'public',
    });
  }, [liveProfile.id, liveProfile.username, liveProfile.bio, liveProfile.city, liveProfile.neighborhood, liveProfile.favorite_slice, liveProfile.favorite_spot_id, liveProfile.pizza_style, liveProfile.dietary_notes, liveProfile.instagram_url, liveProfile.website_url, liveProfile.profile_visibility]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured || !supabase || !user?.id) throw new Error('Profile is not connected yet.');
      const payload = {
        username: form.username.trim() || displayName,
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        favorite_slice: form.favorite_slice.trim() || null,
        favorite_spot_id: form.favorite_spot_id || null,
        pizza_style: form.pizza_style.trim() || null,
        dietary_notes: form.dietary_notes.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        website_url: form.website_url.trim() || null,
        profile_visibility: form.profile_visibility || 'public',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Profile updated');
      setEditing(false);
      await refreshProfile?.();
      queryClient.invalidateQueries({ queryKey: ['profile-bundle', user?.id] });
    },
    onError: (error) => {
      toast.error(error?.message?.includes('column') ? 'Profile columns are missing in the database. Run the included SQL file.' : error?.message || 'The profile could not be updated.');
    },
  });

  if (!user) return <div className="min-h-[calc(100vh-64px)] bg-[#060606]" />;

  const onUploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Photo upload is not connected yet.');
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('profiles').update({ avatar_url: filePath, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      setAvatarPreview(await resolveAvatar(filePath));
      await refreshProfile?.();
      queryClient.invalidateQueries({ queryKey: ['profile-bundle', user.id] });
    } catch (error) {
      toast.error(error?.message || 'Could not upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#060606] px-4 py-4 text-white">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr,1.1fr]">
        <section className="rounded-[26px] border border-white/10 bg-[#101010] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[30px] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-4 min-[380px]:flex-row min-[380px]:items-center">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-3xl font-black text-white sm:h-24 sm:w-24 sm:rounded-[28px]">
                {avatarPreview ? <img src={avatarPreview} alt={displayName} className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
                <label className="absolute bottom-2 right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/75 text-white">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
                </label>
              </div>
              <div className="min-w-0">
                <div className="break-words text-[clamp(1.65rem,9vw,2rem)] font-black tracking-tight text-white">{displayName}</div>
                <div className="text-sm text-stone-500">@{handle}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {role === 'admin' ? <span className="rounded-full bg-[#efbf3a] px-3 py-1 text-xs font-black text-[#141414]">Admin</span> : null}
                  {liveProfile.city ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-stone-300">{liveProfile.city}</span> : null}
                  {liveProfile.neighborhood ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-stone-300">{liveProfile.neighborhood}</span> : null}
                </div>
              </div>
            </div>
            <Link to={createPageUrl('SettingsPage')} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-200">
              <Settings className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-7 text-stone-300">
            {liveProfile.bio || 'Add a short bio so other pizza people know your style.'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <Heart className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite slice</div>
              <div className="mt-1 font-black">{liveProfile.favorite_slice || 'Not set'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <MapPin className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite spot</div>
              <div className="mt-1 font-black">{favoriteSpot?.name || 'Not set'}</div>
            </div>
          </div>

          {profileProgress < 100 ? (
            <div className="mt-5 rounded-[24px] border border-[#efbf3a]/20 bg-[#efbf3a]/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#efbf3a]">Profile onboarding</div>
                  <div className="mt-1 text-lg font-black text-white">{profileProgress}% complete</div>
                </div>
                <Button onClick={() => setEditing(true)} className="h-10 rounded-2xl bg-[#efbf3a] px-4 text-sm font-black text-[#111111] hover:bg-[#d9a826]">Complete</Button>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/35">
                <div className="h-full rounded-full bg-[#efbf3a]" style={{ width: `${profileProgress}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profileChecklist.map((item) => (
                  <span key={item.label} className={`rounded-full border px-3 py-1 text-xs font-bold ${item.done ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-black/25 text-stone-400'}`}>
                    {item.done ? 'Done' : 'Missing'} - {item.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <Pizza className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Pizza style</div>
              <div className="mt-1 font-black">{liveProfile.pizza_style || 'Not set'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <Award className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Dietary notes</div>
              <div className="mt-1 font-black">{liveProfile.dietary_notes || 'Not set'}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={MapPin} label="Spots" value={bundle?.createdSpots?.length || 0} />
            <Stat icon={CalendarDays} label="Plans" value={bundle?.plans?.length || 0} />
            <Stat icon={Star} label="Ratings" value={bundle?.ratings?.length || 0} />
            <Stat icon={MessageSquare} label="Reviews" value={bundle?.comments?.length || 0} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setEditing((value) => !value)} className="h-12 rounded-2xl bg-[#df5b43] font-bold text-white hover:bg-[#c84b35]">
              {editing ? 'Close editor' : 'Edit profile'}
            </Button>
            <Link to={`/profile/${user.id}`} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white hover:bg-white/[0.07]">
              <UserRound className="mr-2 h-4 w-4" />
              Public view
            </Link>
            {role === 'admin' ? (
              <Link to={createPageUrl('Admin')} className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#efbf3a]/30 bg-[#17130a] text-sm font-bold text-[#efbf3a]">
                <Shield className="mr-2 h-4 w-4" />
                Admin panel
              </Link>
            ) : null}
            <button type="button" onClick={logout} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-stone-200">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </div>

          {uploading ? <div className="mt-3 text-xs text-stone-500">Uploading avatar...</div> : null}
        </section>

        <section className="space-y-5">
          {editing ? (
            <div className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
              <div className="text-xl font-black">Profile editor</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Username</Label>
                  <Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">City / neighborhood</Label>
                  <Input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Neighborhood</Label>
                  <Input value={form.neighborhood} onChange={(e) => setForm((prev) => ({ ...prev, neighborhood: e.target.value }))} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite slice</Label>
                  <Input value={form.favorite_slice} onChange={(e) => setForm((prev) => ({ ...prev, favorite_slice: e.target.value }))} placeholder="Pepperoni, grandma, margherita..." className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Pizza style</Label>
                  <Input value={form.pizza_style} onChange={(e) => setForm((prev) => ({ ...prev, pizza_style: e.target.value }))} placeholder="Cheap slices, classics, date-night spots..." className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Dietary notes</Label>
                  <Input value={form.dietary_notes} onChange={(e) => setForm((prev) => ({ ...prev, dietary_notes: e.target.value }))} placeholder="Vegetarian, halal, gluten-free..." className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite spot</Label>
                  <select value={form.favorite_spot_id} onChange={(e) => setForm((prev) => ({ ...prev, favorite_spot_id: e.target.value }))} className="h-10 w-full rounded-md border border-white/10 bg-[#171717] px-3 text-sm text-white">
                    <option value="">Choose a spot</option>
                    {(bundle?.spots || []).map((spot) => <option key={spot.id} value={spot.id}>{spot.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Profile visibility</Label>
                  <select value={form.profile_visibility} onChange={(e) => setForm((prev) => ({ ...prev, profile_visibility: e.target.value }))} className="h-10 w-full rounded-md border border-white/10 bg-[#171717] px-3 text-sm text-white">
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Bio</Label>
                  <Textarea value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} className="min-h-[110px] border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Instagram URL</Label>
                  <Input value={form.instagram_url} onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Website URL</Label>
                  <Input value={form.website_url} onChange={(e) => setForm((prev) => ({ ...prev, website_url: e.target.value }))} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
              </div>
              <Button disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()} className="mt-5 h-12 rounded-2xl bg-[#efbf3a] px-5 font-black text-[#141414] hover:bg-[#dbab23]">
                Save profile
              </Button>
            </div>
          ) : null}


          <div className="rounded-[30px] border border-white/10 bg-[#101010] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#efbf3a]/20 bg-[#efbf3a]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#efbf3a]">
                  <ChefHat className="h-3.5 w-3.5" />
                  Home pizza lab
                </div>
                <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Share your homemade pizza recipe</div>
                <p className="mt-2 text-sm leading-6 text-stone-500">Keep it simple: name, short method, dough style and bake time. People can vote and push it into the recipe ranking.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Input value={recipeForm.title} onChange={(e) => setRecipeForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Recipe name" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
              <Input value={recipeForm.doughStyle} onChange={(e) => setRecipeForm((prev) => ({ ...prev, doughStyle: e.target.value }))} placeholder="Dough style" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
              <Input value={recipeForm.bakeTime} onChange={(e) => setRecipeForm((prev) => ({ ...prev, bakeTime: e.target.value }))} placeholder="Bake time, e.g. 7 min" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
              <select value={recipeForm.difficulty} onChange={(e) => setRecipeForm((prev) => ({ ...prev, difficulty: e.target.value }))} className="h-12 rounded-2xl border border-white/10 bg-[#171717] px-3 text-sm font-bold text-white">
                <option>Easy</option>
                <option>Medium</option>
                <option>Advanced</option>
              </select>
              <Textarea value={recipeForm.description} onChange={(e) => setRecipeForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Short recipe: ingredients, oven temperature, little trick..." className="min-h-[110px] rounded-2xl border-white/10 bg-white/[0.04] text-white sm:col-span-2" />
            </div>

            <Button disabled={createRecipeMutation.isPending} onClick={() => createRecipeMutation.mutate()} className="mt-4 h-12 rounded-2xl bg-[#efbf3a] px-5 font-black text-[#141414] hover:bg-[#dbab23]">
              <Plus className="mr-2 h-4 w-4" />
              Publish recipe
            </Button>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {(recipes.length ? recipes : recipeRankings.slice(0, 2)).map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} rank={index + 1} onVote={(item) => voteRecipeMutation.mutate(item)} voting={voteRecipeMutation.isPending} />
              ))}
              {!recipes.length && !recipeRankings.length ? (
                <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500 lg:col-span-2">
                  No recipes yet. Publish the first one.
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black">Activity</div>
                <div className="mt-1 text-sm text-stone-500">Reviews, ratings, plans and spots attached to your profile.</div>
              </div>
              {isLoading ? <span className="text-xs text-stone-500">Loading...</span> : null}
            </div>
            <div className="grid gap-3">
              {(bundle?.ratings || []).slice(0, 4).map((rating) => (
                <ActivityItem key={rating.id} title={`${Number(rating.rating).toFixed(1)} stars at ${rating.spot?.name || 'Pizza spot'}`} meta="Rating">
                  {rating.spot?.address || 'No address'}
                </ActivityItem>
              ))}
              {(bundle?.comments || []).slice(0, 4).map((comment) => (
                <ActivityItem key={comment.id} title={comment.spot?.name || 'Pizza spot'} meta={`Review - ${comment.status || 'pending'}`}>
                  {comment.content}
                </ActivityItem>
              ))}
              {(bundle?.plans || []).slice(0, 3).map((plan) => (
                <ActivityItem key={plan.id} title={plan.title} meta={`Plan - ${plan.status}`}>
                  {plan.plan_date} {String(plan.plan_time || '').slice(0, 5)}
                </ActivityItem>
              ))}
              {!isLoading && !(bundle?.ratings?.length || bundle?.comments?.length || bundle?.plans?.length) ? (
                <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">
                  No activity yet. Rate a spot, write a review or create a plan.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-[#efbf3a]" />
              <div className="text-xl font-black">Reputation</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ActivityItem title="Explorer" meta="Profile badge">Adds spots and ratings.</ActivityItem>
              <ActivityItem title="Host" meta="Profile badge">Creates pizza plans.</ActivityItem>
              <ActivityItem title="Reviewer" meta="Profile badge">Leaves useful notes.</ActivityItem>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
