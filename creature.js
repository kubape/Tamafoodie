import { creatures, feedingSpeech, getPetState } from './data/game.js';

const art = {
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

export const variants = [
  {
    id: 'crumb', description: 'Pointy ears and tiny paws',
    miniature: ['/\\___/\\', '( o o )', ' / ~ \\ '],
  },
  {
    id: 'bean', description: 'A smooth, round head',
    miniature: [' .---. ', '( o o )', ' (___) '],
    crown: ['      .---------.      ', '    .-           -.    '],
  },
  {
    id: 'pip', description: 'Two tall antennae',
    miniature: [' o   o ', ' |___| ', '( . . )'],
    crown: ['     o           o     ', '     |___________|     '],
  },
  {
    id: 'moss', description: 'Three jagged spikes',
    miniature: [' /^M^\\ ', '( - - )', ' \\___/ '],
    crown: ['      /\\   /\\   /\\     ', '     /  \\_/  \\_/  \\    '],
  },
  {
    id: 'nib', description: 'One eye and a crooked horn',
    miniature: ['   /|  ', ' _( O )', ' \\___/ '],
    crown: ['              /|       ', '      .------/ |       '],
    cyclops: true,
  },
  {
    id: 'mochi', description: 'Long, floppy ears',
    miniature: [' __ __ ', '/  V  \\', 'u(o o)u'],
    crown: ['    ___       ___      ', '  /     \\___/     \\    '],
    ears: [' /  /           \\  \\   ', '(  |             |  )  ', ' \\_|             |_/   '],
  },
].map((variant) => ({ ...variant, name: creatures[variant.id].name }));

const moods = {
  hungry: { label: 'Hungry', status: 'is hungry.', pose: 'crouches with a wobbly mouth and a drawn-in belly.' },
  fed: { label: 'Full', status: 'is full.', pose: 'sits upright with a smile and a round belly.' },
  craving: { label: 'Craving', status: 'wants seconds.', pose: 'leans forward with pursed lips and a raised paw.' },
};

const bodyLabels = { 'in-shape': 'In shape', starving: 'Starving', 'getting-fat': 'Getting rounder' };
const demoSpeech = {
  hungry: 'Finally! I was starving over here.',
  fed: 'I am soooo full.',
  craving: 'Any chance there’s more of my favorite?',
};

export function getCreature(pet, meals, { now = Date.now(), override, chewing = false } = {}) {
  const state = getPetState(pet, meals, { now });
  const mood = chewing ? 'fed' : override || state.mood;
  const { label, status, pose } = !override && !chewing && mood === 'hungry' && state.tummy === 'peckish'
    ? { ...moods.hungry, label: 'Peckish', status: 'could go for a bite.' }
    : moods[mood];
  const variant = variants.find(({ id }) => id === pet.variant) ?? variants[0];
  const lines = [...art[mood]];
  if (variant.crown) {
    const eyes = variant.cyclops
      ? (mood === 'fed' ? '    ^    ' : '    O    ')
      : { hungry: ' o     o ', fed: ' ^     ^ ', craving: ' o     O ' }[mood];
    const mouth = { hungry: '    ~    ', fed: ' .  w  . ', craving: '     :>  ' }[mood];
    const cheeks = variant.ears ?? [
      '    /             \\    ',
      '   |               |   ',
      '   |               |   ',
    ];
    const face = ['         ', eyes, mouth].map((row, index) => cheeks[index].slice(0, 7) + row + cheeks[index].slice(16));
    lines.splice(1, 6, ...variant.crown, ...face, '    \\_____________/    ');
  }
  if (chewing) lines[5] = lines[5].replace('w', 'O');

  let description = `${pet.name} ${pose} ${variant.description}.`;
  if (chewing) description = `${pet.name} opens its mouth for a bite. ${variant.description}.`;
  if (pet.mealsFed >= 3) {
    lines[0] = '     +           +     ';
    description += ' Little tufts have grown above its head.';
  }
  return {
    label, mood, description, title: `${pet.name} ${status}`,
    speech: override ? demoSpeech[mood] : state.speech,
    bodyLabel: bodyLabels[state.bodyCondition],
    art: lines.map((line) => line.padEnd(23)).join('\n'),
  };
}

export { feedingSpeech as mealReaction };
