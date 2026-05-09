// Boroughs
export const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

// Pizza styles
export const PIZZA_CATEGORIES = [
  "Classic NY Slice", "Neapolitan", "Square/Sicilian",
  "Coal-Fired", "Wood-Fired", "Detroit Style",
  "Grandma Style", "Artisan", "Late Night"
];

// Price ranges
export const PRICES = [
  { value: "$", label: "$", desc: "Budget", color: "bg-green-500" },
  { value: "$$", label: "$$", desc: "Mid", color: "bg-yellow-500" },
  { value: "$$$", label: "$$$", desc: "Premium", color: "bg-red-500" },
];

// Sort options
export const SORT_OPTIONS = [
  { value: "", label: "Nearest" },
  { value: "rating", label: "Top Rated" },
  { value: "featured", label: "Featured" },
  { value: "price_low", label: "Lowest Price" },
];

// Map styles
export const MAP_STYLES = [
  { id: "positron", name: "Voyager", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" },
  { id: "light", name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
  { id: "dark", name: "Dark", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" },
];

