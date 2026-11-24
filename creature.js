const art = {
  dormant: [
    '           .           ',
    '          / \\          ',
    '        .\'   \`.        ',
    '       /       \\       ',
    '      /    .    \\      ',
    '     |    /_     |     ',
    '     |      /    |     ',
    '      \\         /      ',
    '    .  \`-.___.-\'       ',
    '    ___/ /_\\ \\____     ',
    ' .-================-.  ',
  ],
  hungry: [
    '                       ',
    '     /\\         /\\     ',
    '    /  \\_______/  \\    ',
    '   /               \\   ',
    '  |    o       o    |  ',
    '  |        ~        |  ',
    '   \\    .-----.    /   ',
    '    \`-./   :   \\.-\'    ',
    '      /_.-----._\\      ',
    '      \'         \'      ',
    ' .-=================-. ',
  ],
  fed: [
    '   *                 . ',
    '       /\\       /\\     ',
    '   .  /  \\_____/  \\    ',
    '     /             \\   ',
    '    |   ^       ^   |  ',
    '    |  .    w    .  |  ',
    '     \\             /   ',
    '     /\`-._______.-\'\\   ',
    '    (   (_______)   )  ',
    '     \`---\'     \`---\'   ',
    ' .-=================-. ',
  ],
  craving: [
    '                   ?   ',
    '                 .     ',
    '        /\\      /|     ',
    '       /  \\____/ |     ',
    '      /           \\    ',
    '     |    o     O  |   ',
    '     |          :> |   ',
    '      \\___        /    ',
    '     /|   \`------\'     ',
    '    (_/  \\__)\\__)      ',
    ' .-=================-. ',
  ],
};

const moods = {
  dormant: { label: 'Dormant', title: 'Something’s stirring.', line: 'A small creature is waiting to meet you.', description: 'A speckled egg with a crack in its shell rests on a nest.' },
  hungry: { label: 'Hungry', title: 'Scraps is hungry.', line: 'Two big eyes. One very empty belly.', description: 'Scraps crouches with wide eyes, a wobbly mouth, and a drawn-in belly.' },
  fed: { label: 'Recently fed', title: 'Scraps is full.', line: 'A round belly and a very pleased little face.', description: 'Scraps sits upright with gleeful closed eyes, a smile, and a round belly.' },
  craving: { label: 'Craving', title: 'Scraps wants seconds.', description: 'Scraps leans forward with one wide eye, pursed lips, and a raised paw.' },
};

const hour = 60 * 60 * 1000;
const dishKey = (title) => title.toLowerCase().replace(/\s+/g, ' ').trim();

function familiarMeal(meals) {
  const dishes = new Map();
  for (const meal of meals) {
    const key = dishKey(meal.title);
    const entry = dishes.get(key) ?? { title: meal.title, count: 0, latest: '' };
    entry.count += 1;
    if (meal.eatenAt > entry.latest) {
      entry.title = meal.title;
      entry.latest = meal.eatenAt;
    }
    dishes.set(key, entry);
  }
  return [...dishes.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest))[0]?.title;
}

export function getCreature(pet, meals, { now = Date.now(), override, reaction } = {}) {
  const hoursSinceMeal = pet?.lastFedAt ? (now - Date.parse(pet.lastFedAt)) / hour : Infinity;
  const favorite = familiarMeal(meals);
  let mood = 'dormant';
  if (pet) {
    if (reaction && reaction.until > now) mood = 'fed';
    else if (override) mood = override;
    else if (hoursSinceMeal < 4) mood = 'fed';
    else if (favorite && hoursSinceMeal < 18) mood = 'craving';
    else mood = 'hungry';
  }

  const view = { ...moods[mood], mood };
  const lines = [...art[mood]];
  if (pet?.mealsFed >= 3) {
    lines[0] = '     +           +     ';
    view.description += ' Little tufts have grown above its ears.';
  }
  if (mood === 'craving') view.line = `It keeps thinking about “${favorite ?? 'buttered toast'}”.`;
  if (reaction && reaction.until > now) {
    view.title = reaction.title;
    view.line = reaction.line;
  }
  view.art = lines.join('\n');
  return view;
}

export function mealReaction(meal, previousMeals, mealsFed) {
  const familiar = previousMeals.some(({ title }) => dishKey(title) === dishKey(meal.title));
  if (mealsFed === 3) return { title: 'Scraps grew tufts!', line: 'Three meals in, and it’s growing into its ears.' };
  if (familiar) return { title: 'Scraps knows that one!', line: 'A happy little wiggle for a familiar meal.' };
  const reactions = [
    { title: 'Scraps goes chomp!', line: 'It puffs up like a tiny bread roll.' },
    { title: 'Scraps does a shimmy!', line: 'That was worth a whole-body wiggle.' },
  ];
  return reactions[(mealsFed - 1) % reactions.length];
}
