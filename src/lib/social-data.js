import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const LOCAL_CHECKINS = "sozzial_local_checkins";
const LOCAL_ACTIVITY = "sozzial_local_activity";

function readLocal(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value.slice(0, 100)));
}

export const PASSPORT_TASKS = [
  { id: "first_checkin", label: "First check-in", description: "Mark that you are at a pizza spot.", target: 1, metric: "checkins" },
  { id: "slice_hunter", label: "Slice hunter", description: "Check in at 5 different pizza spots.", target: 5, metric: "uniqueSpots" },
  { id: "reviewer", label: "Reviewer", description: "Leave 3 public notes or reviews.", target: 3, metric: "comments" },
  { id: "social_host", label: "Social host", description: "Create or join 2 pizza plans.", target: 2, metric: "plans" },
];

export async function createCheckIn({ userId, spotId, slicePrice, note }) {
  const payload = {
    user_id: userId || null,
    spot_id: spotId,
    slice_price: slicePrice ? Number(slicePrice) : null,
    note: note || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase && userId) {
    const { error } = await supabase.from("check_ins").insert(payload);
    if (!error) {
      await supabase.from("activity_events").insert({
        user_id: userId,
        event_type: "check_in",
        entity_type: "spot",
        entity_id: spotId,
        metadata: { slice_price: payload.slice_price, note: payload.note },
      });
      return { persisted: true };
    }
  }

  const nextCheckins = [payload, ...readLocal(LOCAL_CHECKINS)];
  writeLocal(LOCAL_CHECKINS, nextCheckins);
  writeLocal(LOCAL_ACTIVITY, [
    { id: window.crypto?.randomUUID?.() || String(Date.now()), event_type: "check_in", metadata: payload, created_at: payload.created_at },
    ...readLocal(LOCAL_ACTIVITY),
  ]);
  return { persisted: false };
}

export async function fetchPassportBundle(userId) {
  if (!userId || !isSupabaseConfigured || !supabase) {
    const checkins = readLocal(LOCAL_CHECKINS);
    return {
      checkins,
      comments: [],
      plans: [],
      uniqueSpots: new Set(checkins.map((row) => row.spot_id)).size,
    };
  }

  const [checkinsRes, commentsRes, ownedPlansRes, joinedPlansRes] = await Promise.all([
    supabase.from("check_ins").select("id,spot_id,slice_price,note,created_at,spots(id,name,address)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("spot_comments").select("id,spot_id,created_at,status").eq("user_id", userId).limit(50),
    supabase.from("plans").select("id").eq("created_by", userId).limit(50),
    supabase.from("plan_members").select("plan_id").eq("user_id", userId).eq("status", "joined").limit(50),
  ]);

  const checkins = checkinsRes.error ? [] : checkinsRes.data || [];
  const comments = commentsRes.error ? [] : commentsRes.data || [];
  const plans = [...(ownedPlansRes.error ? [] : ownedPlansRes.data || []), ...(joinedPlansRes.error ? [] : joinedPlansRes.data || [])];

  return {
    checkins,
    comments,
    plans,
    uniqueSpots: new Set(checkins.map((row) => row.spot_id)).size,
  };
}

export function progressForTask(task, bundle) {
  const metrics = {
    checkins: bundle.checkins?.length || 0,
    uniqueSpots: bundle.uniqueSpots || 0,
    comments: bundle.comments?.filter((row) => row.status !== "rejected").length || 0,
    plans: bundle.plans?.length || 0,
  };
  return Math.min(metrics[task.metric] || 0, task.target);
}

export async function fetchWeeklyRankings() {
  if (!isSupabaseConfigured || !supabase) return { users: [], spots: [] };
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [checkinsRes, commentsRes, profilesRes, spotsRes] = await Promise.all([
    supabase.from("check_ins").select("id,user_id,spot_id,slice_price,created_at").gte("created_at", since.toISOString()).limit(500),
    supabase.from("spot_comments").select("id,user_id,spot_id,created_at,status").gte("created_at", since.toISOString()).limit(500),
    supabase.from("profiles").select("id,username,avatar_url").limit(500),
    supabase.from("spots").select("id,name,address,average_rating,slice_price,status,created_at").order("created_at", { ascending: false }).limit(500),
  ]);

  const checkins = checkinsRes.error ? [] : checkinsRes.data || [];
  const comments = commentsRes.error ? [] : commentsRes.data || [];
  const profiles = new Map((profilesRes.error ? [] : profilesRes.data || []).map((profile) => [profile.id, profile]));
  const spots = new Map((spotsRes.error ? [] : spotsRes.data || []).map((spot) => [spot.id, spot]));

  const userScores = new Map();
  checkins.forEach((row) => userScores.set(row.user_id, (userScores.get(row.user_id) || 0) + 3));
  comments.forEach((row) => userScores.set(row.user_id, (userScores.get(row.user_id) || 0) + 2));

  const spotScores = new Map();
  checkins.forEach((row) => spotScores.set(row.spot_id, (spotScores.get(row.spot_id) || 0) + 2));
  comments.forEach((row) => spotScores.set(row.spot_id, (spotScores.get(row.spot_id) || 0) + 1));

  const rankedSpots = [...spotScores.entries()]
    .filter(([id]) => id)
    .map(([id, score]) => ({ id, score, spot: spots.get(id) || null, source: "weekly" }))
    .sort((a, b) => b.score - a.score);

  const rankedSpotIds = new Set(rankedSpots.map((item) => item.id));
  const starterSpots = [...spots.values()]
    .filter((spot) => spot?.id && !rankedSpotIds.has(spot.id) && spot.status !== "rejected")
    .map((spot) => ({
      id: spot.id,
      score: Number(spot.average_rating || 0) > 0 ? Number(spot.average_rating).toFixed(1) : 0,
      spot,
      source: "starter",
    }))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return {
    users: [...userScores.entries()]
      .filter(([id]) => id)
      .map(([id, score]) => ({ id, score, profile: profiles.get(id) || null }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20),
    spots: [...rankedSpots, ...starterSpots].slice(0, 20),
  };
}

export async function fetchActivityFeed() {
  if (!isSupabaseConfigured || !supabase) return readLocal(LOCAL_ACTIVITY);

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();
  const [eventsRes, recipesRes, followsRes] = await Promise.all([
    supabase
      .from("activity_events")
      .select("id,user_id,event_type,entity_type,entity_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("home_recipes")
      .select("id,user_id,title,description,photo_url,likes_count,created_at,status")
      .eq("status", "published")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("profile_follows")
      .select("follower_id,following_id,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const events = eventsRes.error ? [] : eventsRes.data || [];
  const recipeEvents = recipesRes.error ? [] : (recipesRes.data || []).map((recipe) => ({
    id: `recipe-${recipe.id}`,
    user_id: recipe.user_id,
    event_type: "recipe_posted",
    entity_type: "recipe",
    entity_id: recipe.id,
    metadata: { title: recipe.title, description: recipe.description, photo_url: recipe.photo_url, likes_count: recipe.likes_count },
    created_at: recipe.created_at,
  }));
  const followEvents = followsRes.error ? [] : (followsRes.data || []).map((follow) => ({
    id: `follow-${follow.follower_id}-${follow.following_id}-${follow.created_at}`,
    user_id: follow.follower_id,
    event_type: "profile_followed",
    entity_type: "profile",
    entity_id: follow.following_id,
    metadata: { following_id: follow.following_id },
    created_at: follow.created_at,
  }));

  const rows = [...events, ...recipeEvents, ...followEvents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 80);

  const userIds = [...new Set([
    ...rows.map((row) => row.user_id).filter(Boolean),
    ...rows.map((row) => row.metadata?.following_id).filter(Boolean),
  ])];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,username,avatar_url,bio,city,neighborhood,favorite_slice,pizza_style,reputation_score").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    profile: profileMap.get(row.user_id) || null,
    target_profile: row.metadata?.following_id ? profileMap.get(row.metadata.following_id) || null : null,
  }));
}

export async function fetchSocialDiscovery(viewerId) {
  if (!isSupabaseConfigured || !supabase) return { people: [], spots: [], followingIds: [] };

  const [profilesRes, followsRes, ratingsRes, commentsRes, spotsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,avatar_url,bio,city,neighborhood,favorite_slice,pizza_style,reputation_score,favorite_spot_id")
      .eq("profile_visibility", "public")
      .limit(80),
    viewerId
      ? supabase.from("profile_follows").select("following_id").eq("follower_id", viewerId).limit(500)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("spot_ratings").select("id,user_id,spot_id,rating,updated_at").order("updated_at", { ascending: false }).limit(120),
    supabase.from("spot_comments").select("id,user_id,spot_id,content,status,created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(120),
    supabase.from("spots").select("id,name,address,best_slice,slice_price,average_rating,status").eq("status", "approved").limit(250),
  ]);

  const followingIds = followsRes.error ? [] : (followsRes.data || []).map((row) => row.following_id);
  const profiles = profilesRes.error ? [] : profilesRes.data || [];
  const ratings = ratingsRes.error ? [] : ratingsRes.data || [];
  const comments = commentsRes.error ? [] : commentsRes.data || [];
  const spots = spotsRes.error ? [] : spotsRes.data || [];
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  const profileScores = new Map();

  ratings.forEach((row) => profileScores.set(row.user_id, (profileScores.get(row.user_id) || 0) + 2));
  comments.forEach((row) => profileScores.set(row.user_id, (profileScores.get(row.user_id) || 0) + 3));

  const people = profiles
    .filter((profile) => profile.id && profile.id !== viewerId)
    .map((profile) => ({
      ...profile,
      social_score: (profileScores.get(profile.id) || 0) + Number(profile.reputation_score || 0),
      is_following: followingIds.includes(profile.id),
    }))
    .sort((a, b) => Number(b.is_following) - Number(a.is_following) || b.social_score - a.social_score)
    .slice(0, 12);

  const spotScores = new Map();
  ratings.forEach((row) => {
    const spot = spotMap.get(row.spot_id);
    if (!spot) return;
    spotScores.set(row.spot_id, (spotScores.get(row.spot_id) || 0) + Number(row.rating || 0));
  });
  comments.forEach((row) => {
    if (!spotMap.has(row.spot_id)) return;
    spotScores.set(row.spot_id, (spotScores.get(row.spot_id) || 0) + 2);
  });

  const recommendedSpots = [...spotScores.entries()]
    .map(([id, score]) => ({ ...spotMap.get(id), social_score: score }))
    .sort((a, b) => b.social_score - a.social_score)
    .slice(0, 8);

  return { people, spots: recommendedSpots, followingIds };
}


const LOCAL_RECIPES = "sozzial_local_home_recipes";
const LOCAL_RECIPE_VOTES = "sozzial_local_recipe_votes";

async function attachRecipeProfiles(recipes) {
  const rows = Array.isArray(recipes) ? recipes : [];
  if (!rows.length || !isSupabaseConfigured || !supabase) return rows;
  const userIds = [...new Set(rows.map((recipe) => recipe.user_id).filter(Boolean))];
  if (!userIds.length) return rows;
  const { data } = await supabase
    .from("profiles")
    .select("id,username,avatar_url,bio,city")
    .in("id", userIds);
  const profileMap = new Map((data || []).map((profile) => [profile.id, profile]));
  return rows.map((recipe) => ({ ...recipe, profiles: profileMap.get(recipe.user_id) || null }));
}

export async function fetchProfileRecipes(profileId, viewerId) {
  if (!profileId) return [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("home_recipes")
      .select("id,user_id,title,description,dough_style,difficulty,bake_time,photo_url,ingredients,preparation_steps,oven_temp,servings,tags,likes_count,created_at")
      .eq("user_id", profileId)
      .eq("status", "published")
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);
    if (!error) {
      const ids = (data || []).map((recipe) => recipe.id);
      const votes = viewerId && ids.length
        ? await supabase.from("home_recipe_votes").select("recipe_id").eq("user_id", viewerId).in("recipe_id", ids)
        : { data: [] };
      const liked = new Set((votes.data || []).map((vote) => vote.recipe_id));
      return attachRecipeProfiles((data || []).map((recipe) => ({ ...recipe, viewer_liked: liked.has(recipe.id) })));
    }
  }

  return readLocal(LOCAL_RECIPES)
    .filter((recipe) => recipe.user_id === profileId)
    .map((recipe) => ({ ...recipe, viewer_liked: readLocal(LOCAL_RECIPE_VOTES).some((vote) => vote.recipe_id === recipe.id && vote.user_id === viewerId) }));
}

export async function fetchHomeRecipeById(recipeId, viewerId) {
  if (!recipeId) return null;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("home_recipes")
      .select("id,user_id,title,description,dough_style,difficulty,bake_time,photo_url,ingredients,preparation_steps,oven_temp,servings,tags,likes_count,status,created_at,updated_at")
      .eq("id", recipeId)
      .maybeSingle();
    if (!error && data && data.status !== "removed") {
      const vote = viewerId
        ? await supabase.from("home_recipe_votes").select("recipe_id").eq("user_id", viewerId).eq("recipe_id", recipeId).maybeSingle()
        : { data: null };
      return (await attachRecipeProfiles([{ ...data, viewer_liked: Boolean(vote.data) }]))[0] || null;
    }
  }

  const recipe = readLocal(LOCAL_RECIPES).find((item) => item.id === recipeId);
  if (!recipe) return null;
  return { ...recipe, viewer_liked: readLocal(LOCAL_RECIPE_VOTES).some((vote) => vote.recipe_id === recipeId && vote.user_id === viewerId) };
}
export async function fetchRecipeRankings(viewerId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("home_recipes")
      .select("id,user_id,title,description,dough_style,difficulty,bake_time,photo_url,ingredients,preparation_steps,oven_temp,servings,tags,likes_count,status,created_at,updated_at")
      .eq("status", "published")
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) {
      const ids = (data || []).map((recipe) => recipe.id);
      const votes = viewerId && ids.length
        ? await supabase.from("home_recipe_votes").select("recipe_id").eq("user_id", viewerId).in("recipe_id", ids)
        : { data: [] };
      const liked = new Set((votes.data || []).map((vote) => vote.recipe_id));
      return attachRecipeProfiles((data || []).map((recipe) => ({ ...recipe, viewer_liked: liked.has(recipe.id) })));
    }
  }
  return readLocal(LOCAL_RECIPES).filter((recipe) => recipe.status !== "removed" && recipe.status !== "hidden").sort((a, b) => Number(b.likes_count || 0) - Number(a.likes_count || 0)).slice(0, 20);
}

export async function createHomeRecipe({ userId, title, description, doughStyle, difficulty, bakeTime, photoUrl, ingredients, preparationSteps, ovenTemp, servings, tags }) {
  const payload = {
    user_id: userId,
    title: title.trim(),
    description: description.trim(),
    dough_style: doughStyle.trim() || null,
    difficulty: difficulty || "Easy",
    bake_time: bakeTime.trim() || null,
    photo_url: photoUrl || null,
    ingredients: ingredients.trim() || null,
    preparation_steps: preparationSteps.trim() || null,
    oven_temp: ovenTemp.trim() || null,
    servings: servings.trim() || null,
    tags: Array.isArray(tags) ? tags.filter(Boolean).slice(0, 8) : [],
    status: "published",
  };
  if (!payload.user_id || !payload.title || !payload.description) throw new Error("Add a recipe name and a short description.");

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("home_recipes").insert(payload).select().single();
    if (!error) {
      await supabase.from("activity_events").insert({
        user_id: userId,
        event_type: "recipe_posted",
        entity_type: "recipe",
        entity_id: data.id,
        metadata: { title: payload.title },
      });
      return data;
    }
    if (!String(error.message || "").includes("home_recipes")) throw error;
  }

  const recipe = {
    id: window.crypto?.randomUUID?.() || String(Date.now()),
    ...payload,
    likes_count: 0,
    created_at: new Date().toISOString(),
  };
  writeLocal(LOCAL_RECIPES, [recipe, ...readLocal(LOCAL_RECIPES)]);
  return recipe;
}

export async function voteHomeRecipe({ userId, recipeId, liked }) {
  if (!userId || !recipeId) throw new Error("Log in to vote for recipes.");

  if (isSupabaseConfigured && supabase) {
    if (liked) {
      const { error } = await supabase.from("home_recipe_votes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("home_recipe_votes").upsert({ user_id: userId, recipe_id: recipeId });
      if (error) throw error;
    }
    return { liked: !liked };
  }

  const votes = readLocal(LOCAL_RECIPE_VOTES);
  const nextVotes = liked ? votes.filter((vote) => !(vote.user_id === userId && vote.recipe_id === recipeId)) : [{ user_id: userId, recipe_id: recipeId }, ...votes];
  writeLocal(LOCAL_RECIPE_VOTES, nextVotes);
  const recipes = readLocal(LOCAL_RECIPES).map((recipe) => recipe.id === recipeId ? { ...recipe, likes_count: Math.max(0, Number(recipe.likes_count || 0) + (liked ? -1 : 1)) } : recipe);
  writeLocal(LOCAL_RECIPES, recipes);
  return { liked: !liked };
}
export async function fetchProfileSocialState({ viewerId, profileId }) {
  if (!viewerId || !profileId || !isSupabaseConfigured || !supabase) {
    return { isFollowing: false, followersCount: 0, followingCount: 0 };
  }

  const [followingRes, followersCountRes, followingCountRes] = await Promise.all([
    supabase.from("profile_follows").select("following_id").eq("follower_id", viewerId).eq("following_id", profileId).maybeSingle(),
    supabase.from("profile_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("profile_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profileId),
  ]);

  return {
    isFollowing: !followingRes.error && Boolean(followingRes.data),
    followersCount: followersCountRes.error ? 0 : followersCountRes.count || 0,
    followingCount: followingCountRes.error ? 0 : followingCountRes.count || 0,
  };
}

export async function setProfileFollow({ viewerId, profileId, follow }) {
  if (!viewerId || !profileId || !isSupabaseConfigured || !supabase) throw new Error("Social follow is not connected yet.");
  if (follow) {
    const { error } = await supabase.from("profile_follows").upsert({ follower_id: viewerId, following_id: profileId });
    if (error) throw error;
    return { following: true };
  }
  const { error } = await supabase.from("profile_follows").delete().eq("follower_id", viewerId).eq("following_id", profileId);
  if (error) throw error;
  return { following: false };
}

const LOCAL_RECIPE_COMMENTS = "sozzial_local_recipe_comments";
const LOCAL_REPORTS = "sozzial_local_reports";

export async function fetchRecipeComments(recipeId) {
  if (!recipeId) return [];
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("home_recipe_comments")
      .select("id,recipe_id,user_id,content,status,created_at,profiles(id,username,avatar_url)")
      .eq("recipe_id", recipeId)
      .neq("status", "hidden")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) return data || [];
  }
  return readLocal(LOCAL_RECIPE_COMMENTS).filter((row) => row.recipe_id === recipeId && row.status !== "hidden");
}

export async function createRecipeComment({ userId, recipeId, content }) {
  const clean = String(content || "").trim();
  if (!userId) throw new Error("Log in to comment.");
  if (!recipeId || clean.length < 2) throw new Error("Write a short comment first.");
  const payload = { recipe_id: recipeId, user_id: userId, content: clean.slice(0, 700), status: "approved" };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("home_recipe_comments").insert(payload).select().single();
    if (!error) {
      await supabase.from("activity_events").insert({
        user_id: userId,
        event_type: "comment_added",
        entity_type: "recipe",
        entity_id: recipeId,
        metadata: { preview: payload.content.slice(0, 90) },
      });
      return data;
    }
    if (!String(error.message || "").includes("home_recipe_comments")) throw error;
  }
  const row = { id: window.crypto?.randomUUID?.() || String(Date.now()), ...payload, created_at: new Date().toISOString() };
  writeLocal(LOCAL_RECIPE_COMMENTS, [row, ...readLocal(LOCAL_RECIPE_COMMENTS)]);
  return row;
}

export async function createReport({ reporterId, entityType, entityId, reason, details }) {
  if (!reporterId) throw new Error("Log in to report content.");
  if (!entityType || !entityId || !reason) throw new Error("Choose a report reason.");
  const payload = {
    reporter_id: reporterId,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    details: String(details || "").trim() || null,
    status: "open",
  };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("reports").insert(payload).select().single();
    if (!error) return data;
    if (!String(error.message || "").includes("reports")) throw error;
  }
  const row = { id: window.crypto?.randomUUID?.() || String(Date.now()), ...payload, created_at: new Date().toISOString() };
  writeLocal(LOCAL_REPORTS, [row, ...readLocal(LOCAL_REPORTS)]);
  return row;
}