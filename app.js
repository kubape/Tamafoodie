import { getCreature, mealReaction, variants } from './creature.js';
import { mealAscii } from './meal-ascii.js';
import { store } from './store.js';

const screen = document.querySelector('#screen');
const navigation = document.querySelector('.navigation');
const routeLink = navigation.querySelector('a');
const announcement = document.querySelector('#announcement');
const demo = new URLSearchParams(location.search).get('demo') === '1';
const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const estimateFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const photoURLs = new Set();
const photoInputs = [...document.querySelectorAll('input[type=file]')];

let state;
let draft = newDraft();
let savingMeal = false;
let talking = false;
let mealScene;
let moodOverride;
let loadingPhoto = false;
let returnMealId;

function newDraft() {
  return { id: crypto.getRandomValues(new Uint32Array(4)).join('-'), title: '', ingredients: '', photo: null };
}

function announce(text) {
  announcement.textContent = text;
}

function selectedRoute() {
  return location.hash.slice(1) || 'pet';
}

function navigate(route) {
  if (selectedRoute() === route) render(true);
  else location.hash = route;
}

function photoURL(blob) {
  const url = URL.createObjectURL(blob);
  photoURLs.add(url);
  return url;
}

function releasePhotos() {
  for (const url of photoURLs) URL.revokeObjectURL(url);
  photoURLs.clear();
}

function renderAdoption() {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Nursery</span></div>
    <div class="intro"><h1>Pick your Scraps.</h1><p>Tap a little creature to adopt it.</p></div>
    <ul class="adoption-grid"></ul>
    <p class="failure" role="alert"></p>`;
  const grid = screen.querySelector('.adoption-grid');
  const failure = screen.querySelector('.failure');
  for (const variant of variants) {
    const item = document.createElement('li');
    item.innerHTML = `<button type="button" class="adoption-card"><span class="miniature" aria-hidden="true"></span><strong></strong></button>`;
    const button = item.querySelector('button');
    button.querySelector('.miniature').textContent = variant.miniature.join('\n');
    button.querySelector('strong').textContent = variant.name;
    button.setAttribute('aria-label', `Adopt ${variant.name}. ${variant.description}.`);
    button.addEventListener('click', async () => {
      const cards = grid.querySelectorAll('button');
      cards.forEach((card) => { card.disabled = true; });
      failure.textContent = '';
      try {
        state.pet = await store.adopt({ variant: variant.id, name: variant.name });
        navigate('pet');
        announce(`${state.pet.name} is home.`);
      } catch {
        cards.forEach((card) => { card.disabled = false; });
        button.focus();
        failure.textContent = 'Couldn’t adopt this Scraps. Try again.';
      }
    });
    grid.append(item);
  }
}

function mealInProgress() {
  return mealScene && mealScene.phase !== 'done';
}

function updateMeter(key, score) {
  const group = screen.querySelector(`[data-meter="${key}"]`);
  const meter = group.querySelector('meter');
  const value = Number.isFinite(score) ? Math.round(Math.min(100, Math.max(0, score))) : null;
  meter.hidden = value === null;
  group.querySelector('.meter-value').textContent = value === null ? 'Unavailable' : `${value}%`;
  group.querySelector('.meter-value').setAttribute('aria-hidden', String(value !== null));
  group.style.setProperty('--score', `${value ?? 0}%`);
  group.classList.toggle('meter-unavailable', value === null);
  if (value !== null) {
    meter.value = value;
    meter.setAttribute('aria-valuetext', `${value} percent`);
  }
}

function updateScene() {
  const scene = screen.querySelector('.habitat');
  if (!scene) return;
  const phase = mealScene?.phase ?? '';
  const chewing = phase === 'bite';
  const view = getCreature(state.pet, state.meals, { override: moodOverride, chewing });
  const creature = scene.querySelector('.creature');
  const talk = scene.querySelector('.creature-touch');
  const condition = screen.querySelector('.condition');
  const dialogue = screen.querySelector('.dialogue');
  const food = scene.querySelector('.scene-food');

  creature.textContent = view.art;
  talk.setAttribute('aria-label', `Talk to ${state.pet.name}. ${view.description}`);
  talk.setAttribute('aria-expanded', String(talking));
  talk.setAttribute('aria-disabled', String(Boolean(mealInProgress())));
  condition.textContent = `${view.label} · ${view.bodyLabel}`;
  condition.dataset.mood = view.mood;
  screen.querySelector('h1').textContent = mealInProgress() ? `A bite for ${state.pet.name}.` : view.title;
  updateMeter('fullness', view.fullness);
  updateMeter('nutrition', view.nutritionalValue);
  dialogue.hidden = !talking;
  dialogue.querySelector('.speaker').textContent = state.pet.name;
  dialogue.querySelector('.dialogue-line').textContent = {
    photo: 'One photo. Let me turn that into a bite…',
    ascii: 'There! Now that looks like food to me.',
    bite: 'Nom!',
    done: mealScene?.reaction,
  }[phase] ?? view.speech;
  dialogue.querySelector('.picker-buttons').hidden = Boolean(mealScene);
  dialogue.querySelector('.resume-draft').hidden = Boolean(mealScene) || !draft.photo;
  dialogue.querySelector('.close-dialogue').textContent = mealInProgress() ? 'Skip animation' : phase === 'done' ? 'Done' : 'Later';

  food.hidden = !mealInProgress();
  if (food.dataset.phase !== phase) {
    const photo = food.querySelector('img');
    const ascii = food.querySelector('pre');
    food.dataset.phase = phase;
    if (phase === 'photo') photo.src = photoURL(mealScene.photo);
    else if (photo.hasAttribute('src')) {
      URL.revokeObjectURL(photo.src);
      photoURLs.delete(photo.src);
      photo.removeAttribute('src');
    }
    photo.hidden = phase !== 'photo';
    ascii.hidden = phase !== 'ascii' && !chewing;
    ascii.textContent = mealScene?.ascii ?? '';
    scene.classList.toggle('has-food', Boolean(mealInProgress()));
  }
}

function setTalking(open) {
  talking = open;
  if (!open) mealScene = undefined;
  updateScene();
  const target = screen.querySelector(open ? '.dialogue' : '.creature-touch');
  target.focus({ preventScroll: !open });
}

function finishMealScene(sequence) {
  if (mealScene !== sequence || sequence.phase === 'done') return;
  sequence.phase = 'done';
  updateScene();
  if (selectedRoute() === 'pet') announce(sequence.reaction);
}

function playMealScene(photo, ascii, reaction) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sequence = { photo, ascii, reaction, phase: reducedMotion ? 'ascii' : 'photo' };
  mealScene = sequence;
  talking = true;
  if (reducedMotion) {
    window.setTimeout(() => finishMealScene(sequence), 1250);
    return;
  }
  for (const [delay, phase] of [[650, 'ascii'], [1700, 'bite']]) {
    window.setTimeout(() => {
      if (mealScene !== sequence || sequence.phase === 'done') return;
      sequence.phase = phase;
      updateScene();
    }, delay);
  }
  window.setTimeout(() => finishMealScene(sequence), 2300);
}

function renderPet() {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Habitat</span><span class="condition"></span></div>
    <div class="habitat">
      <div class="habitat-interior">
        <div class="scene-stage">
          <button type="button" class="creature-touch" aria-controls="pet-dialogue">
            <span class="creature" aria-hidden="true"></span>
          </button>
          <div class="scene-food" aria-hidden="true" hidden><img alt="" hidden><pre hidden></pre></div>
          <div class="scene-floor" aria-hidden="true"></div>
        </div>
        <section class="dialogue" id="pet-dialogue" aria-labelledby="speaker" aria-describedby="pet-speech" tabindex="-1" hidden>
          <h2 id="speaker" class="speaker"></h2><p id="pet-speech" class="dialogue-line"></p>
          <div class="picker-buttons">
            <button class="button primary" type="button" data-picker="camera">Take photo</button>
            <button class="button" type="button" data-picker="library">Choose photo</button>
          </div>
          <p class="message" data-photo-error role="alert"></p>
          <div class="dialogue-actions">
            <a class="text-button resume-draft" href="#feed" hidden>Resume meal</a>
            <button type="button" class="text-button close-dialogue">Later</button>
          </div>
        </section>
      </div>
    </div>
    <div class="scene-caption"><h1></h1></div>
    <div class="pet-meters">
      <div class="pet-meter" data-meter="fullness">
        <span class="meter-label" id="fullness-label">Fullness</span><span class="meter-value"></span>
        <meter aria-labelledby="fullness-label" class="sr-only" min="0" max="100"></meter>
        <span class="meter-track" aria-hidden="true"></span>
      </div>
      <div class="pet-meter" data-meter="nutrition">
        <span class="meter-label" id="nutrition-label">Nutritional value</span><span class="meter-value"></span>
        <meter aria-labelledby="nutrition-label" class="sr-only" min="0" max="100"></meter>
        <span class="meter-track" aria-hidden="true"></span>
      </div>
    </div>`;
  const talk = screen.querySelector('.creature-touch');
  const dialogue = screen.querySelector('.dialogue');
  talk.addEventListener('click', () => {
    if (mealInProgress()) return;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const creature = talk.querySelector('.creature');
      creature.getAnimations().forEach((animation) => animation.cancel());
      creature.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(-9px) scale(1.03)', offset: 0.4 },
        { transform: 'translateY(0)' },
      ], { duration: 240, easing: 'ease-out' });
    }
    setTalking(!talking);
  });
  dialogue.querySelector('.close-dialogue').addEventListener('click', () => {
    if (mealInProgress()) finishMealScene(mealScene);
    else setTalking(false);
  });
  dialogue.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setTalking(false);
  });
  updateScene();

  if (demo) {
    const controls = document.createElement('details');
    controls.className = 'demo-controls';
    controls.innerHTML = `<summary>Prototype controls</summary>
      <div class="demo-actions">
        <button class="button" type="button" data-mood="hungry">Hungry</button>
        <button class="button" type="button" data-mood="fed">Recently fed</button>
        <button class="button" type="button" data-mood="craving">Craving</button>
        <button class="button" type="button" data-mood="">Use meal data</button>
      </div>`;
    controls.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mood]');
      if (!button || mealInProgress()) return;
      moodOverride = button.dataset.mood;
      updateScene();
      announce(screen.querySelector('h1').textContent);
    });
    screen.append(controls);
  }
}

function parseIngredients(text) {
  const entries = text.match(/(?:\d,\d+\s*(?:kg|g|oz)\b|[^,\n])+/gi) ?? [];
  return [...new Set(entries.map((value) => value.trim()).filter(Boolean))];
}

function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const finish = (callback) => {
      URL.revokeObjectURL(url);
      callback(image);
    };
    image.onload = () => finish(resolve);
    image.onerror = () => finish(reject);
    image.src = url;
  });
}

function setPhotoError(message) {
  const error = screen.querySelector('[data-photo-error]');
  if (error) error.textContent = message;
  screen.querySelector('.photo-frame')?.setAttribute('aria-invalid', String(Boolean(message)));
}

function showDraftPhoto() {
  const frame = screen.querySelector('.entry-form .photo-frame');
  if (!frame) return;
  const preview = frame.querySelector('img');
  if (preview.hasAttribute('src')) {
    URL.revokeObjectURL(preview.src);
    photoURLs.delete(preview.src);
    preview.removeAttribute('src');
  }
  if (draft.photo) preview.src = photoURL(draft.photo);
  preview.hidden = !draft.photo;
  frame.querySelector('.photo-placeholder').hidden = Boolean(draft.photo);
  screen.querySelector('.photo-remove').hidden = !draft.photo;
}

function updatePhotoControls() {
  for (const button of screen.querySelectorAll('[data-picker], .photo-remove, .entry-form [type="submit"]')) {
    button.disabled = loadingPhoto;
  }
}

screen.addEventListener('click', (event) => {
  const picker = event.target.closest('[data-picker]');
  if (picker && !loadingPhoto) document.getElementById(picker.dataset.picker).click();
});

for (const input of photoInputs) {
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file || savingMeal || loadingPhoto) return;
    const route = selectedRoute();
    loadingPhoto = true;
    updatePhotoControls();
    setPhotoError('');
    try {
      const image = await loadPhoto(file);
      let ascii;
      try {
        ascii = mealAscii(image);
      } catch {
        ascii = ' .------. \n( :::::::: )\n \\________/';
      }
      draft.photo = file;
      draft.ascii = ascii;
      if (selectedRoute() === 'pet' && route === 'pet' && talking) navigate('feed');
      else if (selectedRoute() === 'feed') showDraftPhoto();
      else if (selectedRoute() === 'pet') updateScene();
      announce('Meal photo ready.');
    } catch {
      if (selectedRoute() === route) setPhotoError('This photo couldn’t be opened. Try a different photo.');
    } finally {
      loadingPhoto = false;
      updatePhotoControls();
    }
  });
}

function renderFeed() {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Habitat</span><a class="button" href="#pet">Back to pet</a></div>
    <div class="intro"><h1>Feed Scraps.</h1><p>Snap or choose a photo of a meal you ate.</p></div>
    <form class="entry-form" novalidate>
      <fieldset><div class="form-stack">
        <div class="field">
          <p class="field-heading" id="photo-label">Meal photo</p>
          <div role="group" aria-labelledby="photo-label" aria-describedby="feed-photo-error">
            <div class="photo-frame">
              <p class="photo-placeholder"><span aria-hidden="true">[ + ]</span> No photo yet</p>
              <img alt="Your selected meal photo" hidden>
            </div>
            <div class="picker-buttons">
              <button class="button" type="button" data-picker="camera">Take photo</button>
              <button class="button" type="button" data-picker="library">Choose photo</button>
            </div>
            <button type="button" class="text-button photo-remove" hidden>Remove photo</button>
            <p id="feed-photo-error" data-photo-error class="message" role="alert"></p>
          </div>
        </div>
        <div class="field">
          <label for="meal-title">Meal title</label>
          <input id="meal-title" type="text" required maxlength="100" placeholder="e.g. Tomato toast" aria-describedby="title-error">
          <p id="title-error" class="message" role="alert"></p>
        </div>
        <div class="field">
          <label for="ingredients">Ingredients <span class="optional">(optional)</span></label>
          <textarea id="ingredients" rows="2" maxlength="600" aria-describedby="ingredients-help"></textarea>
          <p class="help" id="ingredients-help">Separate ingredients with commas or new lines.</p>
        </div>
        ${demo ? `<label class="demo-check"><input type="checkbox" id="fail-next"> Simulate a failed save</label>` : ''}
        <div>
          <p class="failure" role="alert"></p>
          <button class="button primary block" type="submit">Save meal &amp; feed</button>
        </div>
      </div></fieldset>
    </form>`;

  const form = screen.querySelector('form');
  const fieldset = form.querySelector('fieldset');
  const title = form.querySelector('#meal-title');
  const ingredients = form.querySelector('#ingredients');
  const titleError = form.querySelector('#title-error');
  const remove = form.querySelector('.photo-remove');
  const submit = form.querySelector('[type="submit"]');
  const failure = form.querySelector('.failure');
  const activeDraft = draft;

  title.value = activeDraft.title;
  ingredients.value = activeDraft.ingredients;
  fieldset.disabled = savingMeal;
  showDraftPhoto();
  remove.addEventListener('click', () => {
    activeDraft.photo = null;
    activeDraft.ascii = undefined;
    setPhotoError('');
    showDraftPhoto();
    form.querySelector('[data-picker="camera"]').focus();
  });
  title.addEventListener('input', () => {
    activeDraft.title = title.value;
    if (title.value.trim()) {
      title.removeAttribute('aria-invalid');
      titleError.textContent = '';
    }
  });
  ingredients.addEventListener('input', () => { activeDraft.ingredients = ingredients.value; });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (savingMeal || loadingPhoto) return;
    const mealTitle = title.value.trim();
    const needsPhoto = !activeDraft.photo;
    setPhotoError(needsPhoto ? 'Add a photo of this meal.' : '');
    title.setAttribute('aria-invalid', String(!mealTitle));
    titleError.textContent = mealTitle ? '' : 'Enter a title for this meal.';
    failure.textContent = '';
    if (needsPhoto || !mealTitle) {
      (needsPhoto ? form.querySelector('[data-picker="camera"]') : title).focus();
      return;
    }

    const simulation = form.querySelector('#fail-next');
    if (simulation?.checked) {
      store.simulateNextMealFailure();
      simulation.checked = false;
    }
    savingMeal = true;
    fieldset.disabled = true;
    submit.textContent = 'Saving meal…';
    try {
      const { pet, meal } = await store.saveMeal({
        id: activeDraft.id, title: mealTitle, ingredients: parseIngredients(ingredients.value), photo: activeDraft.photo,
      });
      const reaction = mealReaction(meal, state.meals, pet);
      state.pet = pet;
      state.meals = [meal, ...state.meals.filter(({ id }) => id !== meal.id)];
      moodOverride = undefined;
      draft = newDraft();
      if (selectedRoute() === 'feed' || selectedRoute() === 'pet') {
        playMealScene(activeDraft.photo, activeDraft.ascii, reaction);
        announce('Meal saved. Your Scraps turns the photo into a bite.');
        navigate('pet');
      } else {
        announce(`Meal saved. ${reaction}`);
        render(false);
      }
    } catch {
      if (form.isConnected) failure.textContent = 'The meal couldn’t be saved. Your draft is still here. Try again.';
      else announce('The meal couldn’t be saved. Talk to your Scraps to resume the draft.');
    } finally {
      savingMeal = false;
      const visibleForm = screen.querySelector('.entry-form');
      if (visibleForm && selectedRoute() === 'feed') {
        fieldset.disabled = false;
        submit.textContent = 'Save meal & feed';
        if (visibleForm !== form) render(false);
      }
    }
  });
}

function renderMeals() {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Food log</span></div>
    <div class="intro"><h1>Meal history.</h1></div>
    <div class="meal-content"></div>`;
  const content = screen.querySelector('.meal-content');
  if (!state.meals.length) {
    content.innerHTML = `
      <div class="empty">
        <pre aria-hidden="true">.-----------.\n(             )\n '-._______.-'</pre>
        <h2>No meals yet</h2><p>Tap your Scraps in the habitat to share a meal.</p>
      </div>`;
    return;
  }

  let lastDay;
  let list;
  const meals = [...state.meals].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt));
  for (const meal of meals) {
    const date = new Date(meal.eatenAt);
    const day = dayFormat.format(date);
    if (day !== lastDay) {
      const section = document.createElement('section');
      section.className = 'date-group';
      section.innerHTML = '<h2 class="date-heading"></h2><ul class="meal-list"></ul>';
      section.querySelector('h2').textContent = day;
      list = section.querySelector('ul');
      content.append(section);
      lastDay = day;
    }
    const row = document.createElement('li');
    row.innerHTML = `<a class="meal-row"><img alt="" loading="lazy"><span><strong></strong><time></time></span><span aria-hidden="true">›</span></a>`;
    row.querySelector('a').href = `#meal/${meal.id}`;
    const thumbnail = row.querySelector('img');
    if (meal.photo) thumbnail.src = photoURL(meal.photo);
    else thumbnail.classList.add('missing-photo');
    row.querySelector('strong').textContent = meal.title;
    const time = row.querySelector('time');
    time.dateTime = meal.eatenAt;
    time.textContent = timeFormat.format(date);
    list.append(row);
  }
}

const nutritionLabels = {
  light: 'Estimated light meal',
  balanced: 'Estimated balanced meal',
  rich: 'Estimated rich meal',
  unknown: 'Meal type unclear',
};

const estimateFields = [
  ['servingGrams', 'Serving', 'g'],
  ['calories', 'Calories', 'kcal'],
  ['carbs', 'Carbs', 'g'],
  ['sugars', 'Sugars', 'g'],
  ['fat', 'Fat', 'g'],
  ['protein', 'Protein', 'g'],
  ['fiber', 'Fiber', 'g'],
];

function renderDetail(meal) {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Food log</span><a href="#meals" class="button">Back to meals</a></div>
    <div class="intro"><h1></h1><p><time></time></p><p class="meal-nutrition"></p></div>
    <div class="meal-content">
      <img class="meal-photo">
      <section class="nutrition-section" aria-labelledby="nutrition-heading">
        <h2 id="nutrition-heading">Approximate nutrition</h2>
        <p class="estimate-note"></p>
        <dl class="estimate-values" hidden></dl>
      </section>
      <section class="ingredient-section" aria-labelledby="ingredient-heading">
        <h2 id="ingredient-heading">Ingredients</h2>
        <div class="ingredient-view">
          <p class="ingredient-empty">No ingredients added.</p>
          <ul class="ingredient-list" hidden></ul>
          <button class="button ingredient-edit" type="button">Edit ingredients</button>
        </div>
        <form class="ingredient-edit" hidden>
          <fieldset>
            <div class="field">
              <label for="edit-ingredients">Edit ingredients</label>
              <textarea id="edit-ingredients" rows="3" maxlength="600" aria-describedby="edit-help"></textarea>
              <p id="edit-help" class="help">Separate ingredients with commas or new lines.</p>
            </div>
            <p class="failure" role="alert"></p>
            <div class="detail-actions">
              <button class="button primary" type="submit">Save ingredients</button>
              <button class="button" type="button">Cancel</button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>`;
  screen.querySelector('h1').textContent = meal.title;
  const time = screen.querySelector('time');
  time.dateTime = meal.eatenAt;
  time.textContent = dayFormat.format(new Date(meal.eatenAt));
  const nutrition = screen.querySelector('.meal-nutrition');
  const estimateNote = screen.querySelector('.estimate-note');
  const estimateValues = screen.querySelector('.estimate-values');
  function updateNutrition() {
    const estimate = meal.nutrition?.estimate;
    nutrition.textContent = nutritionLabels[meal.nutrition?.kind] ?? '';
    nutrition.hidden = !nutrition.textContent;
    estimateValues.hidden = !estimate;
    if (!estimate) {
      estimateNote.textContent = 'Estimate unavailable for this meal.';
      estimateValues.replaceChildren();
      return;
    }

    estimateNote.textContent = estimate.basis === 'ingredients'
      ? 'Based on recognized ingredients.'
      : 'Based on a typical recipe.';
    const rows = estimateFields.map(([key, label, unit]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      value.textContent = Number.isFinite(estimate[key]) ? `${estimateFormat.format(estimate[key])} ${unit}` : 'Unavailable';
      row.append(term, value);
      return row;
    });
    estimateValues.replaceChildren(...rows);
  }
  updateNutrition();
  const photo = screen.querySelector('.meal-photo');
  if (meal.photo) {
    photo.src = photoURL(meal.photo);
    photo.alt = `Meal photo for ${meal.title}`;
  } else {
    const placeholder = document.createElement('p');
    placeholder.className = 'photo-frame';
    placeholder.textContent = 'Meal photo unavailable.';
    photo.replaceWith(placeholder);
  }
  returnMealId = meal.id;

  const view = screen.querySelector('.ingredient-view');
  const list = view.querySelector('ul');
  const edit = view.querySelector('button');
  const form = screen.querySelector('form');
  const textarea = form.querySelector('textarea');
  const fieldset = form.querySelector('fieldset');
  const failure = form.querySelector('.failure');

  function showIngredients(ingredients) {
    const items = ingredients.map((ingredient) => {
      const item = document.createElement('li');
      item.textContent = ingredient;
      return item;
    });
    list.replaceChildren(...items);
    list.hidden = items.length === 0;
    view.querySelector('p').hidden = items.length > 0;
    edit.textContent = items.length ? 'Edit ingredients' : 'Add ingredients';
  }

  function toggleEditing(editing) {
    view.hidden = editing;
    form.hidden = !editing;
    (editing ? textarea : edit).focus();
  }

  showIngredients(meal.ingredients);
  edit.addEventListener('click', () => {
    textarea.value = meal.ingredients.join('\n');
    failure.textContent = '';
    toggleEditing(true);
  });
  form.querySelector('[type="button"]').addEventListener('click', () => toggleEditing(false));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    fieldset.disabled = true;
    failure.textContent = '';
    try {
      meal = await store.updateIngredients(meal.id, parseIngredients(textarea.value));
      state.meals = state.meals.map((entry) => entry.id === meal.id ? meal : entry);
      updateNutrition();
      showIngredients(meal.ingredients);
      if (form.isConnected) toggleEditing(false);
      announce('Ingredients saved.');
    } catch {
      failure.textContent = 'The ingredients couldn’t be saved. Try again.';
    } finally {
      fieldset.disabled = false;
    }
  });
}

function render(focus) {
  releasePhotos();
  let route = selectedRoute();
  const meal = route.startsWith('meal/') ? state.meals.find(({ id }) => id === route.slice(5)) : undefined;
  if (!state.pet || (!['pet', 'feed', 'meals'].includes(route) && !meal)) {
    route = 'pet';
    if (location.hash && location.hash !== '#pet') history.replaceState(null, '', '#pet');
  }
  navigation.hidden = !state.pet || (route !== 'pet' && route !== 'meals');
  const target = route === 'meals' ? 'pet' : 'meals';
  routeLink.href = `#${target}`;
  routeLink.querySelector('.icon').className = `icon icon-${target}`;
  routeLink.querySelector('.navigation-label').textContent = target === 'pet' ? 'Back to pet' : 'Meals';
  if (!state.pet) renderAdoption();
  else if (route === 'feed') renderFeed();
  else if (route === 'meals') renderMeals();
  else if (meal) renderDetail(meal);
  else renderPet();
  updatePhotoControls();
  if (focus) {
    window.scrollTo(0, 0);
    const previous = route === 'meals' && returnMealId
      ? [...screen.querySelectorAll('.meal-row')].find((link) => link.hash === `#meal/${returnMealId}`)
      : null;
    const dialogue = route === 'pet' && mealInProgress() ? screen.querySelector('.dialogue') : null;
    (previous || dialogue || screen).focus();
  }
  if (!meal) returnMealId = undefined;
}

try {
  state = await store.load();
  screen.removeAttribute('aria-busy');
  render(false);
  window.addEventListener('hashchange', () => render(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateScene(); });
  window.setInterval(updateScene, 60000);
} catch {
  screen.removeAttribute('aria-busy');
  screen.innerHTML = '<div class="intro"><h1>Scraps couldn’t wake up.</h1><p>Device storage is unavailable. Reload to try again.</p></div><button class="button primary">Reload</button>';
  screen.querySelector('button').addEventListener('click', () => location.reload());
}
