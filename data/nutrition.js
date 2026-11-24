export const NUTRITION_VERSION = 1;

// CREA food-composition values in source order below are per 100 g of edible food.
// "Carbs" uses available carbohydrate, with fiber listed separately. Trace values round to zero.
// The food codes are documented in data/README.md.
const foods = {
  rice: [/\b(?:rice|riso|ryz|risotto)\b/, 'grains', 150, [100, 24.2, 0.1, 0.1, 2, 0.2]],
  dryRice: [/\b(?:(?:dry|raw|uncooked|arborio|carnaroli) (?:\w+ )?rice|riso crudo|riso (?:arborio|carnaroli))\b/, 'grains', 80, [334, 80.4, 0.2, 0.4, 6.7, 1]],
  pasta: [/\b(?:pasta|spaghetti|penne|rigatoni|fusilli|fettuccine|tagliatelle|makaron)\b/, 'grains', 160, [175, 37.3, 1.1, 0.6, 6.9, 0.9]],
  bread: [/\b(?:bread|toast|pane|chleb)\b/, 'grains', 60, [268, 59.5, 2, 0.5, 8.1, 3.8]],
  wholeBread: [/\b(?:whole (?:wheat|grain) (?:bread|toast)|wholemeal (?:bread|toast)|pane integrale|chleb razowy)\b/, 'grains', 60, [224, 44.1, 2, 1.3, 8.5, 6.5]],
  oats: [/\b(?:oats|oatmeal|porridge|avena|platki owsiane)\b/, 'grains', 45, [367, 66.8, 0.6, 7.5, 8, 8.3]],
  chicken: [/\b(?:chicken|pollo|kurczak)\b/, 'meat', 120, [129, 0, 0, 0.9, 30.2, 0]],
  bacon: [/\b(?:bacon|pancetta|guanciale|boczek)\b/, 'meat', 30, [337, 0, 0, 28.1, 20.9, 0]],
  salmon: [/\b(?:salmon|salmone|losos)\b/, 'seafood', 120, [185, 1, 1, 12, 18.4, 0]],
  egg: [/\b(?:eggs?|uov[ao]|jajk[ao])\b/, 'eggs', 50, [128, 0, 0, 8.7, 12.4, 0]],
  chickpeas: [/\b(?:chickpeas?|garbanzo|ceci|ciecierzyc[ay])\b/, 'legumes', 110, [132, 18.9, 1.3, 2.4, 7, 5.8]],
  beans: [/\b(?:beans?|fagioli|fasola)\b/, 'legumes', 110, [117, 17, 1.2, 0.7, 7.9, 7.8]],
  lentils: [/\b(?:lentils?|lenticchie|soczewica)\b/, 'legumes', 110, [109, 16.3, 0.7, 0.4, 6.9, 8.3]],
  broccoli: [/\b(?:broccoli|broccolo|brokul)\b/, 'vegetables', 85, [34, 3.2, 3.2, 0.4, 3.1, 3.2]],
  carrot: [/\b(?:carrots?|carot[ae]|marchew)\b/, 'vegetables', 70, [47, 8.7, 8.7, 0.2, 1.3, 3.6]],
  tomato: [/\b(?:tomato(?:es)?|pomodor[oi]|pomidor)\b/, 'vegetables', 80, [23, 3.5, 3.5, 0.2, 1, 2]],
  lettuce: [/\b(?:lettuce|lattuga|salata)\b/, 'vegetables', 65, [22, 2.2, 2.2, 0.4, 1.8, 1.5]],
  onion: [/\b(?:onions?|cipoll[ae]|cebula)\b/, 'vegetables', 25, [28, 5.7, 5.7, 0.1, 1, 1]],
  mushroom: [/\b(?:mushrooms?|fungh[io]|champignons?|pieczark[ai])\b/, 'vegetables', 65, [24, 0.8, 0.8, 0.2, 3.7, 2.3]],
  apple: [/\b(?:apples?|mel[ae]|jablko)\b/, 'fruit', 150, [44, 10, 10, 0, 0.2, 2.6]],
  banana: [/\b(?:bananas?|banan[ae])\b/, 'fruit', 120, [76, 17.4, 14.8, 0.3, 1.2, 1.8]],
  parmesan: [/\b(?:parmesan|parmigiano(?: reggiano)?|parmezan)\b/, 'dairy', 15, [397, 0, 0, 29.7, 32.4, 0]],
  butter: [/\b(?:butter|burro|maslo)\b/, 'dairy', 10, [758, 1.1, 1.1, 83.4, 0.8, 0]],
  oil: [/\b(?:olive oil|evoo|olio (?:extra vergine|extravergine|di oliva)|oliwa)\b/, null, 10, [899, 0, 0, 99.9, 0, 0]],
};

// Macros per standard serving, from the CREA prepared-dish tables.
const recipes = [
  {
    pattern: /\brisottos?\b/,
    grams: 280,
    values: [506, 71.1, 0.8, 21, 11.5, 2],
    tags: ['grains', 'dairy'],
    base: ['rice', 'dryRice', 'onion', 'butter', 'parmesan'],
    baseWeights: { onion: 7.5, butter: 20, parmesan: 17.5 },
  },
  { pattern: /\bcarbonara\b/, grams: 230, values: [563, 65.3, 2.3, 23.7, 24.8, 2.8], tags: ['grains', 'meat', 'eggs', 'dairy', 'rich'], base: ['pasta', 'bacon', 'egg', 'parmesan', 'oil'] },
  { pattern: /\b(?:bolognese|pasta al ragu)\b/, grams: 330, values: [554, 52.8, 5.3, 26.4, 27.7, 4], tags: ['grains', 'meat', 'vegetables'], base: ['pasta', 'tomato', 'onion', 'carrot', 'oil'] },
  { pattern: /\b(?:pasta al pesto|pesto (?:pasta|spaghetti)|(?:pasta|spaghetti|penne) (?:with )?pesto)\b/, grams: 240, values: [420, 51.4, 3.6, 17.3, 16.1, 3.6], tags: ['grains', 'dairy'], base: ['pasta', 'parmesan', 'oil'] },
  { pattern: /\b(?:tomato (?:pasta|spaghetti)|(?:pasta|spaghetti|penne) (?:with tomato sauce|al (?:sugo di )?pomodoro))\b/, grams: 280, values: [316, 54.6, 6.2, 7.3, 9.2, 4.5], tags: ['grains', 'vegetables'], base: ['pasta', 'tomato', 'onion', 'oil'] },
  { pattern: /\bpizza(?! (?:dough|sauce))\b/, grams: 231, values: [542, 63.3, 2.1, 21.5, 24.7, 6.25], tags: ['grains', 'dairy', 'vegetables', 'rich'], base: ['bread', 'tomato', 'parmesan', 'oil'] },
  { pattern: /\b(?:fried rice|riso (?:alla cantonese|cantonese))\b/, grams: 280, values: [580, 83.4, 7.3, 21.8, 15.4, 4.5], tags: ['grains', 'eggs', 'meat'], base: ['rice', 'dryRice', 'egg', 'onion', 'carrot', 'oil'] },
];

export function words(text) {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ł/gi, 'l').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function weight(text, wholeDish = false) {
  const match = text.match(/(?:^|[^\d.,])([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|oz)\b/i);
  if (!match) return null;
  if (wholeDish && text.slice(0, match.index).trim() && text.slice(match.index + match[0].length).trim()) return null;
  const grams = Number(match[1].replace(',', '.')) * { g: 1, kg: 1000, oz: 28.3495 }[match[2].toLowerCase()];
  return grams > 0 && grams <= 5000 ? grams : null;
}

function foodKeys(text) {
  const keys = Object.keys(foods).filter((key) => foods[key][0].test(text));
  return keys.filter((key) => !(key === 'rice' && keys.includes('dryRice'))
    && !(key === 'bread' && keys.includes('wholeBread')));
}

function tally(basis, components, servingGrams) {
  const grams = components.reduce((total, component) => total + component.grams, 0);
  const factor = (servingGrams ?? grams) / grams;
  const totals = [0, 0, 0, 0, 0, 0];
  for (const component of components) {
    component.values.forEach((value, index) => { totals[index] += value * component.scale * factor; });
  }
  const [calories, carbs, sugars, fat, protein, fiber] = totals.map((value) => Math.max(0, Math.round(value)));
  return { basis, servingGrams: Math.round(grams * factor), calories, carbs, sugars, fat, protein, fiber };
}

export function estimateNutrition(title, ingredients) {
  const dish = words(title);
  const titleWeight = weight(title, true);
  const plantBased = /\b(?:vegan|plant based|vegano|vegana|dairy free|no dairy|without (?:butter|cheese))\b/.test(dish);
  const recipe = recipes.find(({ pattern, tags }) => pattern.test(dish)
    && (!plantBased || !tags.some((tag) => ['dairy', 'meat', 'eggs'].includes(tag))));
  const quantities = new Map(foodKeys(dish).map((key) => [key, null]));
  const measured = new Set();
  for (const item of ingredients) {
    const keys = foodKeys(words(item));
    const grams = keys.length === 1 ? weight(item) : null;
    for (const key of keys) {
      if (grams !== null) {
        quantities.set(key, grams);
        measured.add(key);
      } else if (!quantities.has(key)) {
        quantities.set(key, null);
      }
    }
  }
  for (const [generic, specific] of [['rice', 'dryRice'], ['bread', 'wholeBread']]) {
    if (quantities.has(specific) && !measured.has(generic)) quantities.delete(generic);
  }
  const fromMeasuredRecipe = measured.size >= 2 && ['rice', 'dryRice', 'pasta'].some((key) => measured.has(key));
  const useRecipe = recipe && !fromMeasuredRecipe;
  const tags = new Set(useRecipe ? recipe.tags : []);
  const components = [];
  if (useRecipe) {
    const grams = titleWeight ?? recipe.grams;
    components.push({ grams, scale: grams / recipe.grams, values: recipe.values });
  }
  for (const [key, quantity] of quantities) {
    const [, tag, standardGrams, values] = foods[key];
    let grams = quantity ?? standardGrams;
    if (useRecipe && recipe.base.includes(key)) {
      const baseWeight = recipe.baseWeights?.[key];
      if (quantity === null || baseWeight === undefined) continue;
      grams -= baseWeight * (titleWeight ?? recipe.grams) / recipe.grams;
    }
    components.push({ grams, scale: grams / 100, values });
    if (tag) tags.add(tag);
  }

  const hasMainFood = useRecipe || [...quantities.keys()].some((key) => !['oil', 'butter', 'onion', 'parmesan'].includes(key));
  const estimate = hasMainFood
    ? tally(useRecipe ? 'recipe' : 'ingredients', components, !useRecipe && !measured.size ? titleWeight : null)
    : null;
  return { estimate, tags: [...tags] };
}
