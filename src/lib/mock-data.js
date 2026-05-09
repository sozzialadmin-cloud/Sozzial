export const spots = [
  { id: "spot-1", name: "Corner Slice", area: "Lower East Side", price: 3.25, rating: 4.7, verified: "2 days ago", badge: "Best value", plans: 3 },
  { id: "spot-2", name: "Soho Oven", area: "Soho", price: 4.5, rating: 4.4, verified: "Today", badge: "Fresh photos", plans: 1 },
  { id: "spot-3", name: "Brooklyn Fold", area: "Williamsburg", price: 3.75, rating: 4.8, verified: "1 day ago", badge: "Top rated", plans: 5 },
  { id: "spot-4", name: "Midtown Slice Bar", area: "Midtown", price: 5.25, rating: 4.1, verified: "4 days ago", badge: "Fast lunch", plans: 0 },
];

export const missions = [
  { id: "m1", title: "First check-in", detail: "Verify one slice price.", progress: 1, total: 1 },
  { id: "m2", title: "Slice hunter", detail: "Check in at five different spots.", progress: 3, total: 5 },
  { id: "m3", title: "Reviewer", detail: "Leave three useful notes.", progress: 2, total: 3 },
  { id: "m4", title: "Host energy", detail: "Create or join two pizza plans.", progress: 1, total: 2 },
];

export const activity = [
  { id: "a1", user: "Pepema", text: "verified a $3.25 cheese slice", place: "Corner Slice", time: "Today" },
  { id: "a2", user: "Ana", text: "created a plan for Friday night", place: "Brooklyn Fold", time: "2h ago" },
  { id: "a3", user: "Jose", text: "earned Slice hunter progress", place: "Sozzial Passport", time: "Yesterday" },
];

export const rankings = [
  { id: "u1", name: "Pepema", score: 42, label: "Price verifier" },
  { id: "u2", name: "Ana", score: 35, label: "Plan host" },
  { id: "u3", name: "Jose", score: 31, label: "Reviewer" },
];
