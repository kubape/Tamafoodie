import { getCreature, mealReaction } from './creature.js';
import { store } from './store.js';

const screen = document.querySelector('#screen');
const navigation = document.querySelector('.navigation');
const announcement = document.querySelector('#announcement');
const demo = new URLSearchParams(location.search).get('demo') === '1';
const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const photoURLs = new Set();

let state;
let draft = newDraft();
let savingMeal = false;
let reaction;
let moodOverride;
let photoSelection = 0;
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

function updateScene() {
  const scene = screen.querySelector('.habitat');
  if (!scene) return;
  const view = getCreature(state.pet, state.meals, { override: moodOverride, reaction });
  const creature = scene.querySelector('.creature');
  const condition = screen.querySelector('.condition');
  creature.textContent = view.art;
  creature.setAttribute('aria-label', view.description);
  condition.textContent = view.label;
  condition.dataset.mood = view.mood;
  screen.querySelector('h1').textContent = view.title;
  screen.querySelector('.scene-caption p').textContent = view.line;
}

function renderPet() {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Habitat</span><span class="condition"></span></div>
    <figure class="habitat">
      <div class="habitat-interior">
        <pre class="creature" role="img"></pre>
        <div class="scene-floor" aria-hidden="true"></div>
      </div>
    </figure>
    <div class="scene-caption"><h1></h1><p></p></div>
    <div class="scene-action"></div>`;
  const action = screen.querySelector('.scene-action');
  updateScene();

  if (!state.pet) {
    action.innerHTML = `<button type="button" class="button primary block">Adopt Scraps <span class="action-mark" aria-hidden="true">+</span></button>
      <p class="message" role="alert"></p>`;
    const button = action.querySelector('button');
    button.addEventListener('click', async () => {
      button.disabled = true;
      action.querySelector('.message').textContent = '';
      try {
        state.pet = await store.adopt();
        navigate('pet');
        announce('Scraps has hatched.');
      } catch {
        action.querySelector('.message').textContent = 'Scraps couldn’t hatch. Try adopting again.';
        button.disabled = false;
      }
    });
    return;
  }

  action.innerHTML = `<a class="button primary block" href="#feed">Feed <span class="action-mark" aria-hidden="true">+</span></a>`;
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
      if (!button) return;
      moodOverride = button.dataset.mood;
      reaction = undefined;
      updateScene();
      announce(screen.querySelector('h1').textContent);
    });
    screen.append(controls);
  }
}

function parseIngredients(text) {
  return [...new Set(text.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))];
}

function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const finish = (callback) => {
      URL.revokeObjectURL(url);
      callback();
    };
    image.onload = () => finish(resolve);
    image.onerror = () => finish(reject);
    image.src = url;
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
          <div role="group" aria-labelledby="photo-label" aria-describedby="photo-error">
            <div class="photo-frame">
              <p class="photo-placeholder"><span aria-hidden="true">[ + ]</span> No photo yet</p>
              <img alt="Your selected meal photo" hidden>
            </div>
            <div class="picker-buttons">
              <button class="button" type="button" data-picker="camera">Take photo</button>
              <button class="button" type="button" data-picker="library">Choose photo</button>
            </div>
            <input id="camera" type="file" accept="image/*" capture="environment" hidden>
            <input id="library" type="file" accept="image/*" hidden>
            <button type="button" class="text-button photo-remove" hidden>Remove photo</button>
            <p id="photo-error" class="message" role="alert"></p>
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
  const photoFrame = form.querySelector('.photo-frame');
  const preview = photoFrame.querySelector('img');
  const photoError = form.querySelector('#photo-error');
  const titleError = form.querySelector('#title-error');
  const remove = form.querySelector('.photo-remove');
  const submit = form.querySelector('[type="submit"]');
  const failure = form.querySelector('.failure');
  const activeDraft = draft;
  let checkingPhoto = false;
  let previewURL;

  title.value = activeDraft.title;
  ingredients.value = activeDraft.ingredients;
  fieldset.disabled = savingMeal;
  form.querySelectorAll('[data-picker]').forEach((button) => {
    button.addEventListener('click', () => form.querySelector(`#${button.dataset.picker}`).click());
  });

  function showPhoto() {
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      photoURLs.delete(previewURL);
    }
    previewURL = activeDraft.photo ? photoURL(activeDraft.photo) : undefined;
    if (previewURL) preview.src = previewURL;
    else preview.removeAttribute('src');
    preview.hidden = !previewURL;
    photoFrame.querySelector('.photo-placeholder').hidden = Boolean(previewURL);
    remove.hidden = !previewURL;
  }

  function setPhotoError(message) {
    photoError.textContent = message;
    photoFrame.setAttribute('aria-invalid', String(Boolean(message)));
  }

  async function selectPhoto(event) {
    const input = event.currentTarget;
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const selection = ++photoSelection;
    checkingPhoto = true;
    submit.disabled = true;
    setPhotoError('');
    try {
      await loadPhoto(file);
      if (selection !== photoSelection || !form.isConnected) return;
      activeDraft.photo = file;
      showPhoto();
      announce('Meal photo ready.');
    } catch {
      if (selection === photoSelection && form.isConnected) setPhotoError('This photo couldn’t be opened. Try a different photo.');
    } finally {
      if (selection === photoSelection) {
        checkingPhoto = false;
        submit.disabled = false;
      }
    }
  }

  showPhoto();
  form.querySelectorAll('[type="file"]').forEach((input) => input.addEventListener('change', selectPhoto));
  remove.addEventListener('click', () => {
    photoSelection += 1;
    checkingPhoto = false;
    submit.disabled = false;
    activeDraft.photo = null;
    setPhotoError('');
    showPhoto();
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
    if (savingMeal || checkingPhoto) return;
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
      reaction = { ...mealReaction(meal, state.meals, pet.mealsFed), until: Date.now() + 6500 };
      state.pet = pet;
      state.meals = [meal, ...state.meals.filter(({ id }) => id !== meal.id)];
      moodOverride = undefined;
      draft = newDraft();
      announce(`Meal saved. ${reaction.title} ${reaction.line}`);
      window.setTimeout(updateScene, 6550);
      if (selectedRoute() === 'feed') navigate('pet');
      else render(false);
    } catch {
      if (form.isConnected) failure.textContent = 'The meal couldn’t be saved. Your draft is still here. Try again.';
      else announce('The meal couldn’t be saved. Reopen Feed to retry your draft.');
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
        <h2>No meals yet</h2><p>Your first meal will show up here.</p>
        <a href="#feed" class="button primary">Feed Scraps</a>
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

function renderDetail(meal) {
  screen.innerHTML = `
    <div class="screen-bar"><span class="eyebrow">Food log</span><a href="#meals" class="button">Back to meals</a></div>
    <div class="intro"><h1></h1><p><time></time></p></div>
    <div class="meal-content">
      <img class="meal-photo">
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
  const showNavigation = Boolean(state.pet) && (route === 'pet' || route === 'meals');
  navigation.hidden = !showNavigation;
  for (const link of navigation.querySelectorAll('a')) {
    if (link.hash === `#${route}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (route === 'feed') renderFeed();
  else if (route === 'meals') renderMeals();
  else if (meal) renderDetail(meal);
  else renderPet();
  if (focus) {
    window.scrollTo(0, 0);
    const previous = route === 'meals' && returnMealId
      ? [...screen.querySelectorAll('.meal-row')].find((link) => link.hash === `#meal/${returnMealId}`)
      : null;
    (previous || screen).focus();
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
