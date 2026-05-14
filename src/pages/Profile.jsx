import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, CalendarDays, Camera, ChefHat, Flame, Heart, LogOut, MapPin, MessageSquare, Pizza, Plus, Settings, Shield, Star, Trophy, ThumbsUp, Upload, UserRound } from 'lucide-react';
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
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
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
  const hasDetails = Boolean(recipe.ingredients || recipe.preparation_steps || recipe.oven_temp || recipe.servings);
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-0.5 hover:border-[#efbf3a]/35 hover:bg-white/[0.07]">
      {recipe.photo_url ? <img src={recipe.photo_url} alt={recipe.title} className="h-32 w-full object-cover" /> : null}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#efbf3a]/20 bg-[#efbf3a]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#efbf3a]">
              <Flame className="h-3 w-3" />
              {rank ? `#${rank} recipe` : recipe.difficulty || 'Easy'}
            </div>
            <div className="break-words text-lg font-black leading-tight text-white">{recipe.title}</div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-400">{recipe.description}</p>
          </div>
          <button
            type="button"
            disabled={voting}
            onClick={() => onVote?.(recipe)}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition ${recipe.viewer_liked ? 'border-[#efbf3a]/30 bg-[#efbf3a] text-[#141414]' : 'border-white/10 bg-black/25 text-white hover:bg-white/10'}`}
            aria-label="Vote recipe"
          >
            <ThumbsUp className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.likes_count || 0} likes</span>
          {recipe.dough_style ? <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.dough_style}</span> : null}
          {recipe.bake_time ? <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.bake_time}</span> : null}
          {recipe.oven_temp ? <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-stone-300">{recipe.oven_temp}</span> : null}
          <Link to={`/recipe/${recipe.id}`} className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#141414]">Open recipe</Link>
        </div>
        {hasDetails ? (
          <details className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <summary className="cursor-pointer text-sm font-black text-white">Recipe details</summary>
            {recipe.ingredients ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-400"><b className="text-stone-200">Ingredients:</b> {recipe.ingredients}</p> : null}
            {recipe.preparation_steps ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-400"><b className="text-stone-200">Steps:</b> {recipe.preparation_steps}</p> : null}
          </details>
        ) : null}
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
  const [activeSection, setActiveSection] = useState('recipes');
  const [showRecipeComposer, setShowRecipeComposer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [favoriteSpotQuery, setFavoriteSpotQuery] = useState('');
  const [recipeForm, setRecipeForm] = useState({ title: '', description: '', doughStyle: '', difficulty: 'Easy', bakeTime: '', photoUrl: '', ingredients: '', preparationSteps: '', ovenTemp: '', servings: '', tags: [] });
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
      setRecipeForm({ title: '', description: '', doughStyle: '', difficulty: 'Easy', bakeTime: '', photoUrl: '', ingredients: '', preparationSteps: '', ovenTemp: '', servings: '', tags: [] });
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
  const favoriteSpotOptions = useMemo(() => {
    const spots = bundle?.spots || [];
    const query = favoriteSpotQuery.trim().toLowerCase();
    const approved = spots.filter((spot) => !spot.status || spot.status === 'approved');
    if (!query) return approved.slice(0, 12);
    return approved
      .filter((spot) => `${spot.name || ''} ${spot.address || ''} ${spot.best_slice || ''}`.toLowerCase().includes(query))
      .slice(0, 12);
  }, [bundle?.spots, favoriteSpotQuery]);
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
        profile_visibility: 'public',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Profile updated');
      await refreshProfile?.();
      queryClient.invalidateQueries({ queryKey: ['profile-bundle', user?.id] });
    },
    onError: (error) => {
      toast.error(error?.message?.includes('column') ? 'Profile columns are missing in the database. Run the included SQL file.' : error?.message || 'The profile could not be updated.');
    },
  });

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#060606] px-4 py-8 text-white">
        <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-[#101010] p-6 text-center">
          <div className="text-2xl font-black">Sign in to open your profile</div>
          <p className="mt-2 text-sm leading-6 text-stone-400">Your profile, recipes and social tools are available once you log in.</p>
          <Link to="/auth" className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[#df5b43] px-5 text-sm font-black text-white hover:bg-[#c84b35]">
            Open login
          </Link>
        </div>
      </div>
    );
  }


  const applyRecipePreset = (preset) => {
    const presets = {
      margherita: {
        title: 'Margherita',
        description: 'Tomato, mozzarella, basil and olive oil.',
        doughStyle: 'Neapolitan',
        bakeTime: '7 min',
        ovenTemp: '250 C',
        servings: '2',
        ingredients: 'Pizza dough\nTomato sauce\nFresh mozzarella\nBasil\nOlive oil',
        preparationSteps: 'Stretch the dough.\nAdd tomato and mozzarella.\nBake hot until the crust is spotted.\nFinish with basil and olive oil.',
        tags: ['classic', 'vegetarian'],
      },
      pepperoni: {
        title: 'Pepperoni pan pizza',
        description: 'Crispy edges, melted cheese and pepperoni.',
        doughStyle: 'Pan',
        bakeTime: '14 min',
        ovenTemp: '230 C',
        servings: '2-3',
        ingredients: 'Pan pizza dough\nMozzarella\nPepperoni\nTomato sauce\nOregano',
        preparationSteps: 'Oil the pan.\nPress the dough to the edges.\nAdd sauce, cheese and pepperoni.\nBake until the edges are crisp.',
        tags: ['crispy', 'pepperoni'],
      },
      veggie: {
        title: 'Veggie slice',
        description: 'Easy colorful pizza with vegetables.',
        doughStyle: 'Thin crust',
        bakeTime: '10 min',
        ovenTemp: '240 C',
        servings: '2',
        ingredients: 'Pizza dough\nTomato sauce\nMozzarella\nPeppers\nMushrooms\nOlives',
        preparationSteps: 'Stretch the dough thin.\nAdd sauce, cheese and vegetables.\nBake until the base is crisp.',
        tags: ['vegetarian', 'easy'],
      },
    };
    setRecipeForm((prev) => ({ ...prev, ...presets[preset] }));
  };

  const toggleRecipeTag = (tag) => {
    setRecipeForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((item) => item !== tag) : [...prev.tags, tag],
    }));
  };

  const onRecipePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > 900000) {
      toast.error('Choose a smaller photo, under 900 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRecipeForm((prev) => ({ ...prev, photoUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };
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
    <div className="min-h-[calc(100vh-64px)] bg-[#060606] px-3 py-3 pb-[calc(var(--mobile-nav-height)+1.25rem)] text-white sm:px-4 sm:pb-6">
      <div className="mx-auto grid max-w-5xl gap-4">
        <section className="rounded-[24px] border border-white/10 bg-[#101010] p-4 shadow-[0_16px_42px_rgba(0,0,0,0.30)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-3xl font-black text-white sm:h-20 sm:w-20 sm:rounded-[22px]">
                {avatarPreview ? <img src={avatarPreview} alt={displayName} className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
                <label className="absolute bottom-1 right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/75 text-white">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
                </label>
              </div>
              <div className="min-w-0">
                <div className="break-words text-[clamp(1.35rem,7vw,1.75rem)] font-black tracking-tight text-white">{displayName}</div>
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

          <p className="mt-4 text-sm leading-6 text-stone-300">
            {liveProfile.bio || 'Add a short bio so other pizza people know your style.'}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <Heart className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite slice</div>
              <div className="mt-1 font-black">{liveProfile.favorite_slice || 'Not set'}</div>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <MapPin className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite spot</div>
              <div className="mt-1 font-black">{favoriteSpot?.name || 'Not set'}</div>
            </div>
          </div>

          {profileProgress < 100 ? (
            <div className="mt-4 overflow-hidden rounded-[18px] border border-[#efbf3a]/20 bg-[#efbf3a]/10">
              <button
                type="button"
                onClick={() => setShowOnboarding((value) => !value)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
              >
                <span>
                  <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#efbf3a]">Profile setup</span>
                  <span className="mt-1 block text-sm font-black text-white">{profileProgress}% complete</span>
                </span>
                <span className="rounded-full bg-[#efbf3a] px-3 py-1 text-xs font-black text-[#111111]">{showOnboarding ? 'Hide' : 'Open'}</span>
              </button>
              {showOnboarding ? (
                <div className="border-t border-[#efbf3a]/15 p-3 pt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-black/35">
                    <div className="h-full rounded-full bg-[#efbf3a]" style={{ width: `${profileProgress}%` }} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {profileChecklist.map((item) => (
                      <span key={item.label} className={`rounded-2xl border px-3 py-2 text-xs font-bold ${item.done ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-black/25 text-stone-400'}`}>
                        {item.done ? 'Done' : 'Missing'} - {item.label}
                      </span>
                    ))}
                  </div>
                  <Button onClick={() => setActiveSection('profile')} className="mt-3 h-10 rounded-2xl bg-[#efbf3a] px-4 text-sm font-black text-[#111111] hover:bg-[#d9a826]">Complete profile</Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <Pizza className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Pizza style</div>
              <div className="mt-1 font-black">{liveProfile.pizza_style || 'Not set'}</div>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <Award className="h-4 w-4 text-[#efbf3a]" />
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Dietary notes</div>
              <div className="mt-1 font-black">{liveProfile.dietary_notes || 'Not set'}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat icon={MapPin} label="Spots" value={bundle?.createdSpots?.length || 0} />
            <Stat icon={CalendarDays} label="Plans" value={bundle?.plans?.length || 0} />
            <Stat icon={Star} label="Ratings" value={bundle?.ratings?.length || 0} />
            <Stat icon={MessageSquare} label="Reviews" value={bundle?.comments?.length || 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button onClick={() => setActiveSection('profile')} className="h-11 rounded-2xl bg-[#df5b43] font-bold text-white hover:bg-[#c84b35]">
              Edit profile
            </Button>
            <Link to={`/profile/${user.id}`} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white hover:bg-white/[0.07]">
              <UserRound className="mr-2 h-4 w-4" />
              Public
            </Link>
            {role === 'admin' ? (
              <Link to={createPageUrl('Admin')} className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#efbf3a]/30 bg-[#17130a] text-sm font-bold text-[#efbf3a]">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Link>
            ) : null}
            <button type="button" onClick={logout} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-stone-200">
              <LogOut className="mr-2 h-4 w-4" />
              Exit
            </button>
          </div>

          {uploading ? <div className="mt-3 text-xs text-stone-500">Uploading avatar...</div> : null}
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#101010] p-3 shadow-[0_18px_46px_rgba(0,0,0,0.28)] sm:p-4">
          <div className="grid grid-cols-4 gap-1 rounded-[18px] border border-white/10 bg-black/25 p-1">
            {[
              ['recipes', ChefHat, 'Recipes'],
              ['activity', Star, 'Activity'],
              ['profile', Settings, 'Profile'],
              ['reputation', Award, 'Badges'],
            ].map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveSection(key);
                }}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-[11px] font-black transition ${activeSection === key ? 'bg-white text-[#141414] shadow-[0_8px_22px_rgba(0,0,0,0.22)]' : 'text-stone-400 hover:bg-white/[0.05] hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {activeSection === 'recipes' ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xl font-black text-white">Recipes</div>
                  <div className="mt-1 text-xs text-stone-500">Create, save and vote for home pizza recipes.</div>
                </div>
                <div className="flex gap-2">
                  <Link to={createPageUrl('Rankings')} className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white hover:bg-white/[0.08]">
                    <Trophy className="mr-2 h-4 w-4 text-[#efbf3a]" />
                    Ranking
                  </Link>
                  <Button onClick={() => setShowRecipeComposer((value) => !value)} className="h-10 rounded-2xl bg-[#df5b43] px-4 text-xs font-black text-white hover:bg-[#c84b35]">
                    <Plus className="mr-2 h-4 w-4" />
                    {showRecipeComposer ? 'Close' : 'New recipe'}
                  </Button>
                </div>
              </div>

              {showRecipeComposer ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['margherita', 'Margherita'],
                      ['pepperoni', 'Pepperoni'],
                      ['veggie', 'Veggie'],
                    ].map(([key, label]) => (
                      <button key={key} type="button" onClick={() => applyRecipePreset(key)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-stone-200 hover:bg-white/[0.08]">
                        {label}
                      </button>
                    ))}
                    {['classic', 'crispy', 'quick', 'vegetarian', 'spicy', 'sourdough'].map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleRecipeTag(tag)} className={`rounded-full border px-3 py-2 text-xs font-black ${recipeForm.tags.includes(tag) ? 'border-[#efbf3a]/30 bg-[#efbf3a] text-[#141414]' : 'border-white/10 bg-black/20 text-stone-300'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-[78px] cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-3 text-sm text-stone-300 sm:col-span-2">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/25">
                        <Camera className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-black text-white">{recipeForm.photoUrl ? 'Photo selected' : 'Optional recipe photo'}</span>
                        <span className="mt-1 block text-xs text-stone-500">If you skip it, no image block is shown.</span>
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={onRecipePhoto} />
                    </label>
                    {recipeForm.photoUrl ? <img src={recipeForm.photoUrl} alt="Recipe preview" className="h-32 w-full rounded-2xl object-cover sm:col-span-2" /> : null}
                    <Input value={recipeForm.title} onChange={(e) => setRecipeForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Recipe name" className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
                    <Input value={recipeForm.doughStyle} onChange={(e) => setRecipeForm((prev) => ({ ...prev, doughStyle: e.target.value }))} placeholder="Dough style" className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
                    <Input value={recipeForm.ovenTemp} onChange={(e) => setRecipeForm((prev) => ({ ...prev, ovenTemp: e.target.value }))} placeholder="Oven temp, e.g. 250 C" className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
                    <Input value={recipeForm.bakeTime} onChange={(e) => setRecipeForm((prev) => ({ ...prev, bakeTime: e.target.value }))} placeholder="Bake time, e.g. 7 min" className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
                    <Input value={recipeForm.servings} onChange={(e) => setRecipeForm((prev) => ({ ...prev, servings: e.target.value }))} placeholder="Servings, e.g. 2" className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
                    <select value={recipeForm.difficulty} onChange={(e) => setRecipeForm((prev) => ({ ...prev, difficulty: e.target.value }))} className="h-11 rounded-2xl border border-white/10 bg-[#171717] px-3 text-sm font-bold text-white">
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Advanced</option>
                    </select>
                    <Textarea value={recipeForm.description} onChange={(e) => setRecipeForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Short description" className="min-h-[72px] rounded-2xl border-white/10 bg-white/[0.04] text-white sm:col-span-2" />
                    <Textarea value={recipeForm.ingredients} onChange={(e) => setRecipeForm((prev) => ({ ...prev, ingredients: e.target.value }))} placeholder="Ingredients, one per line" className="min-h-[86px] rounded-2xl border-white/10 bg-white/[0.04] text-white sm:col-span-2" />
                    <Textarea value={recipeForm.preparationSteps} onChange={(e) => setRecipeForm((prev) => ({ ...prev, preparationSteps: e.target.value }))} placeholder="Preparation steps, one per line" className="min-h-[96px] rounded-2xl border-white/10 bg-white/[0.04] text-white sm:col-span-2" />
                  </div>

                  <Button disabled={createRecipeMutation.isPending} onClick={() => createRecipeMutation.mutate()} className="mt-4 h-11 rounded-2xl bg-[#efbf3a] px-5 font-black text-[#141414] hover:bg-[#dbab23]">
                    <Plus className="mr-2 h-4 w-4" />
                    Publish recipe
                  </Button>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {(recipes.length ? recipes : recipeRankings.slice(0, 2)).map((recipe, index) => (
                  <RecipeCard key={recipe.id} recipe={recipe} rank={index + 1} onVote={(item) => voteRecipeMutation.mutate(item)} voting={voteRecipeMutation.isPending} />
                ))}
                {!recipes.length && !recipeRankings.length ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500 lg:col-span-2">
                    No recipes yet. Tap New recipe to publish the first one.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeSection === 'activity' ? (
            <div className="mt-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-black">Activity</div>
                  <div className="mt-1 text-xs text-stone-500">Recent ratings, reviews and pizza plans.</div>
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
          ) : null}

          {activeSection === 'profile' ? (
            <div className="mt-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-black">Profile details</div>
                  <div className="mt-1 text-xs text-stone-500">Photo, bio, favorite slice and social details.</div>
                </div>
                <Link to={`/profile/${user.id}`} className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white hover:bg-white/[0.07]">
                  <UserRound className="mr-2 h-4 w-4" />
                  View public
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Username</Label>
                  <Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">City</Label>
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
                <div className="sm:col-span-2">
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Favorite spot</Label>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-2">
                    <Input
                      value={favoriteSpotQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        const matched = (bundle?.spots || []).find((spot) => {
                          const label = `${spot.name} ${spot.address || ''}`.toLowerCase();
                          return spot.name?.toLowerCase() === value.toLowerCase() || label === value.toLowerCase();
                        });
                        setFavoriteSpotQuery(value);
                        setForm((prev) => ({ ...prev, favorite_spot_id: matched?.id || '' }));
                      }}
                      placeholder="Search your favorite pizza spot"
                      className="border-white/10 bg-[#171717] text-white"
                    />
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {favoriteSpotOptions.map((spot) => (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => {
                            setFavoriteSpotQuery(spot.name);
                            setForm((prev) => ({ ...prev, favorite_spot_id: spot.id }));
                          }}
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black transition ${form.favorite_spot_id === spot.id ? 'border-[#efbf3a] bg-[#efbf3a] text-[#141414]' : 'border-white/10 bg-black/20 text-stone-300 hover:bg-white/10'}`}
                        >
                          {spot.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Bio</Label>
                  <Textarea value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} className="min-h-[96px] border-white/10 bg-white/[0.04] text-white" />
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
              <Button disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()} className="mt-5 h-11 rounded-2xl bg-[#efbf3a] px-5 font-black text-[#141414] hover:bg-[#dbab23]">
                Save profile
              </Button>
            </div>
          ) : null}

          {activeSection === 'reputation' ? (
            <div className="mt-4">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-[#efbf3a]" />
                <div>
                  <div className="text-xl font-black">Reputation</div>
                  <div className="mt-1 text-xs text-stone-500">Visible trust signals for other pizza people.</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ActivityItem title="Explorer" meta="Profile badge">Adds spots and ratings.</ActivityItem>
                <ActivityItem title="Host" meta="Profile badge">Creates pizza plans.</ActivityItem>
                <ActivityItem title="Reviewer" meta="Profile badge">Leaves useful notes.</ActivityItem>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
