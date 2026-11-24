const HOUR = 60 * 60 * 1000;

export const creatures = {
  crumb: { name: 'Crumb', likes: 'grains', dislikes: 'seafood' },
  bean: { name: 'Bean', likes: 'legumes', dislikes: 'rich' },
  pip: { name: 'Pip', likes: 'fruit', dislikes: 'spicy' },
  moss: { name: 'Moss', likes: 'vegetables', dislikes: 'meat' },
  nib: { name: 'Nib', likes: 'meat', dislikes: 'dairy' },
  mochi: { name: 'Mochi', likes: 'sweets', dislikes: 'spicy' },
};

const foods = {
  vegetables: /\b(?:vegetables?|salad|spinach|broccoli|carrots?|tomato(?:es)?|peppers?|mushrooms?|cabbage|lettuce|zucchini|cucumbers?|kale|peas|onions?|cauliflower|aubergine|eggplant)\b/,
  fruit: /\b(?:fruits?|apples?|pears?|bananas?|berries|strawberr(?:y|ies)|orange|grapes|peaches|mango|pineapple|kiwi|avocado)\b/,
  grains: /\b(?:rice|pasta|bread|toast|oats|oatmeal|noodles?|couscous|quinoa|risotto|tortillas?|spaghetti|pizza|cereal|ramen|pierogi|potato(?:es)?)\b/,
  legumes: /\b(?:beans?|chickpeas?|lentils?|tofu|tempeh|edamame|hummus|falafel)\b/,
  meat: /\b(?:chicken|turkey|beef|pork|steak|bacon|ham|sausage|lamb|duck|meatballs?)\b/,
  seafood: /\b(?:fish|salmon|tuna|sardines?|shrimp|prawns?|cod|crab|lobster|seafood|sushi|anchovies)\b/,
  eggs: /\b(?:eggs?|omelett?e|frittata)\b/,
  dairy: /\b(?:cheese|yogurt|yoghurt|milk|cream|mozzarella|feta|parmesan|ricotta)\b/,
  sweets: /\b(?:cake|cookies?|biscuits?|brownies?|doughnuts?|donuts?|ice cream|gelato|chocolate|candy|tiramisu|dessert|pastries|croissants?)\b/,
  spicy: /\b(?:spicy|chili|chilli|chile|jalapenos?|sriracha|hot sauce)\b/,
  rich: /\b(?:deep fried|fries|fried chicken|cheeseburgers?|burgers?|pizza|bacon|nachos|cream sauce|carbonara|alfredo)\b/,
};

const portions = {
  light: { fullness: 25, recovery: 12 },
  balanced: { fullness: 50, recovery: 28 },
  rich: { fullness: 65, recovery: 22 },
  unknown: { fullness: 40, recovery: 18 },
};

function words(text) {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function interpretMeal({ title, ingredients = [] }) {
  const text = words([title, ...ingredients].join(' '));
  const tags = Object.entries(foods).filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  if (tags.includes('sweets') && !tags.includes('rich')) tags.push('rich');
  const produce = tags.includes('vegetables') || tags.includes('fruit');
  const starch = tags.includes('grains');
  const protein = ['legumes', 'meat', 'seafood', 'eggs', 'dairy'].some((tag) => tags.includes(tag));

  let kind = 'unknown';
  if (tags.includes('rich')) kind = 'rich';
  else if (Number(produce) + Number(starch) + Number(protein) >= 2) kind = 'balanced';
  else if (produce) kind = 'light';
  return { kind, tags };
}

function taste(pet, nutrition) {
  const profile = Object.hasOwn(creatures, pet.variant) ? creatures[pet.variant] : creatures.crumb;
  if (nutrition.tags.includes(profile.dislikes)) return 'disliked';
  if (nutrition.tags.includes(profile.likes)) return 'liked';
  return 'neutral';
}

function elapsed(state, at) {
  const hours = Math.max(0, at - state.at) / HOUR;
  const emptyHours = Math.max(0, hours - state.fullness / 6);
  state.fullness = Math.max(0, state.fullness - hours * 6);
  if (state.reserve > 0) state.reserve = Math.max(0, state.reserve - hours * 1.25);
  state.reserve = Math.max(-100, state.reserve - emptyHours * 2);
  state.at = at;
}

function applyMeal(state, nutrition) {
  const portion = portions[nutrition.kind];
  const total = state.fullness + portion.fullness;
  const surplus = Math.max(0, total - 100) * 0.45;
  if (state.reserve < 0) state.reserve = Math.min(0, state.reserve + portion.recovery);
  state.reserve = Math.min(100, state.reserve + surplus + (nutrition.kind === 'rich' ? 4 : 0));
  state.fullness = Math.min(100, total);
}

export function getPetState(pet, meals, { now = Date.now() } = {}) {
  const history = meals
    .map((meal) => ({ meal, at: Date.parse(meal.eatenAt) }))
    .filter(({ at }) => Number.isFinite(at))
    .sort((a, b) => a.at - b.at);
  const adoptedAt = Date.parse(pet.adoptedAt);
  const start = Math.min(now, Number.isFinite(adoptedAt) ? adoptedAt : history[0]?.at ?? now);
  const state = { at: start, fullness: 25, reserve: 0 };
  const favoriteMeals = new Map();
  for (const { meal, at } of history) {
    elapsed(state, Math.min(now, Math.max(start, at)));
    const nutrition = meal.nutrition ?? interpretMeal(meal);
    applyMeal(state, nutrition);
    if (taste(pet, nutrition) === 'disliked') continue;
    const key = words(meal.title);
    const count = (favoriteMeals.get(key)?.count ?? 0) + 1;
    favoriteMeals.set(key, { title: meal.title, count, at });
  }
  elapsed(state, now);

  const bodyCondition = state.reserve <= -35 ? 'starving' : state.reserve >= 30 ? 'getting-fat' : 'in-shape';
  const tummy = state.fullness >= 65 ? 'full' : state.fullness >= 30 ? 'peckish' : 'hungry';
  const favorite = [...favoriteMeals.values()].sort((a, b) => b.count - a.count || b.at - a.at)[0];
  const craving = tummy === 'peckish' && favorite?.count >= 2 ? favorite.title : null;
  const mood = tummy === 'full' ? 'fed' : craving ? 'craving' : 'hungry';
  let speech = 'Finally! My belly’s been rumbling over here.';
  if (bodyCondition === 'starving' && tummy === 'hungry') speech = 'Finally! I was starving over here.';
  if (tummy === 'peckish') speech = 'I could go for a bite. What did you eat?';
  if (tummy === 'full') speech = 'I am soooo full. Got something for later?';
  if (craving) speech = `I keep thinking about ${craving}. Any chance there’s more?`;
  return { tummy, mood, bodyCondition, fullness: Math.round(state.fullness), craving, speech };
}

export function feedingSpeech(meal, previousMeals, pet) {
  const nutrition = meal.nutrition ?? interpretMeal(meal);
  const preference = taste(pet, nutrition);
  const before = getPetState(pet, previousMeals.filter(({ id }) => id !== meal.id), {
    now: Date.parse(meal.eatenAt),
  });

  if (preference === 'disliked') return 'I ate it, but that one really isn’t my thing.';
  if (before.tummy === 'full') return 'Oof. I am soooo full now.';
  if (before.tummy === 'hungry' && before.bodyCondition === 'starving') return 'Finally! I was starving over here.';
  if (preference === 'liked') return 'Mmm! You know what I like.';
  if (pet.mealsFed === 3) return 'Wait. Did I just grow tufts? Three meals can change a Scraps.';
  if (previousMeals.some(({ id, title }) => id !== meal.id && words(title) === words(meal.title))) {
    return 'I know that one! That calls for a happy wiggle.';
  }
  return before.tummy === 'hungry' ? 'Finally! My belly needed that.' : 'That was worth a whole-body shimmy.';
}
