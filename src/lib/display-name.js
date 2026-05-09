export function getPublicUsername(profileOrUser, fallback = "Usuario") {
  const username = String(profileOrUser?.username || '').trim();
  if (username) return username;
  return fallback;
}

export function getAvatarLetter(profileOrUser, fallback = "U") {
  const label = getPublicUsername(profileOrUser, fallback);
  return label.slice(0, 1).toUpperCase() || fallback.slice(0, 1).toUpperCase();
}

