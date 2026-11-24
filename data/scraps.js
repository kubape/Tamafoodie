import { creatures, interpretMeal, mealNutrition } from './game.js';

const DATABASE = 'scraps';
const VERSION = 2;
const PET_ID = 'scraps';

export class ScrapsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ScrapsError';
    this.code = code;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = ({ oldVersion }) => {
      const db = request.result;
      if (oldVersion === 0) {
        db.createObjectStore('pet', { keyPath: 'id' });
        db.createObjectStore('meals', { keyPath: 'id' });
      }

      const photos = db.createObjectStore('photos', { keyPath: 'id' });
      if (oldVersion === 1) {
        const meals = request.transaction.objectStore('meals');
        const entries = meals.openCursor();
        entries.onsuccess = () => {
          const entry = entries.result;
          if (!entry) return;
          const { photo, ...meal } = entry.value;
          if (photo != null) photos.add({ id: meal.id, photo });
          entry.update(meal);
          entry.continue();
        };
      }
    };
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(new ScrapsError('STORAGE_BUSY', 'Close other Scraps tabs and try again.'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) db.close();
      else {
        db.onversionchange = () => db.close();
        resolve(db);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function transact(stores, mode, run) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      let failure;

      // Queue dependent IndexedDB requests synchronously while the transaction is active.
      const guard = (operation) => {
        try {
          operation();
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      const read = (request, next) => {
        request.onsuccess = () => guard(() => next(request.result));
      };
      const store = (name) => tx.objectStore(name);
      const finish = (value) => { result = value; };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Storage transaction stopped.'));
      guard(() => run(store, read, finish));
    });
  } finally {
    db.close();
  }
}

function normalizeIngredients(values) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new ScrapsError('INVALID_INGREDIENTS', 'Ingredients must be a list of names.');
  }
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mealWithPhoto(meal, photo) {
  return { ...meal, nutrition: mealNutrition(meal), photo: photo ?? null };
}

export function load() {
  return transact(['pet', 'meals', 'photos'], 'readonly', (store, read, finish) => {
    const pet = store('pet').get(PET_ID);
    const meals = store('meals').getAll();
    read(store('photos').getAll(), (photos) => {
      const byId = new Map(photos.map(({ id, photo }) => [id, photo]));
      finish({
        pet: pet.result ?? null,
        meals: meals.result.map((meal) => mealWithPhoto(meal, byId.get(meal.id))),
      });
    });
  });
}

export async function adopt({ variant = 'crumb', name } = {}) {
  if (!Object.hasOwn(creatures, variant)) {
    throw new ScrapsError('UNKNOWN_CREATURE', 'Choose one of the available creatures.');
  }
  return transact(['pet'], 'readwrite', (store, read, finish) => {
    const pets = store('pet');
    read(pets.get(PET_ID), (existing) => {
      if (existing) return finish(existing);
      const pet = {
        id: PET_ID,
        name: (typeof name === 'string' && name.trim()) || creatures[variant].name,
        variant,
        adoptedAt: new Date().toISOString(),
        lastFedAt: null,
        mealsFed: 0,
      };
      pets.add(pet);
      finish(pet);
    });
  });
}

export async function saveMeal({ id = crypto.randomUUID(), title, photo, ingredients = [] }) {
  if (typeof title !== 'string' || !title.trim()) {
    throw new ScrapsError('TITLE_REQUIRED', 'Enter a name for the meal.');
  }
  // Some file providers leave the type blank. The feed form checks that the file decodes as an image.
  if (!(photo instanceof Blob) || !photo.size || (photo.type && !photo.type.startsWith('image/'))) {
    throw new ScrapsError('PHOTO_REQUIRED', 'Choose a photo of the meal.');
  }
  if (typeof id !== 'string' || !id.trim()) {
    throw new ScrapsError('INVALID_MEAL_ID', 'The meal needs a valid save ID.');
  }
  const meal = { id, title: title.trim(), ingredients: normalizeIngredients(ingredients) };

  return transact(['pet', 'meals', 'photos'], 'readwrite', (store, read, finish) => {
    const pets = store('pet');
    const meals = store('meals');
    const photos = store('photos');
    const petRequest = pets.get(PET_ID);
    read(meals.get(id), (existing) => {
      const pet = petRequest.result;
      if (!pet) throw new ScrapsError('PET_REQUIRED', 'Adopt Scraps before feeding.');
      if (existing) {
        read(photos.get(id), (saved) => finish({ pet, meal: mealWithPhoto(existing, saved?.photo) }));
        return;
      }

      const eatenAt = new Date().toISOString();
      const entry = { ...meal, eatenAt, nutrition: interpretMeal(meal) };
      const fed = { ...pet, lastFedAt: eatenAt, mealsFed: pet.mealsFed + 1 };
      meals.add(entry);
      photos.add({ id, photo });
      pets.put(fed);
      finish({ pet: fed, meal: { ...entry, photo } });
    });
  });
}

export async function updateIngredients(id, ingredients) {
  const names = normalizeIngredients(ingredients);
  return transact(['meals', 'photos'], 'readwrite', (store, read, finish) => {
    const meals = store('meals');
    const photo = store('photos').get(id);
    read(meals.get(id), (meal) => {
      if (!meal) throw new ScrapsError('MEAL_NOT_FOUND', 'This meal could not be found.');
      const updated = { ...meal, ingredients: names };
      updated.nutrition = interpretMeal(updated);
      meals.put(updated);
      finish({ ...updated, photo: photo.result?.photo ?? null });
    });
  });
}
