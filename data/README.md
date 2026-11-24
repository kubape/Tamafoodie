# Scraps data layer

The app calls the storage API through `store.js`. That module forwards requests to `data/scraps.js` and retains the prototype's one-shot save failure control. Run the app on HTTPS or localhost.

| Function | Resolves to |
| --- | --- |
| `load()` | `{ pet, meals }`, with a null pet before adoption |
| `adopt({ variant, name })` | The new or existing pet. Repeated calls return the same creature |
| `saveMeal({ id, title, photo, ingredients })` | `{ pet, meal }` after the meal, photo, and feeding update commit together |
| `updateIngredients(id, ingredients)` | The updated meal. Pass an empty array to clear the ingredients |

A pet has `id`, `name`, `variant`, `adoptedAt`, `lastFedAt`, and `mealsFed`. Valid variant IDs and their food preferences are in `data/game.js`. Older pets without a variant use Crumb's appearance and preferences. A meal has `id`, `title`, `eatenAt`, `ingredients`, a photo `Blob`, and `nutrition` with a `kind` and food `tags`. Timestamps are UTC ISO strings. Group meal dates in the player's local timezone.

`interpretMeal()` returns a versioned `nutrition` record with `kind`, `tags`, and an `estimate` when the dish or main ingredients can be identified. The estimate gives serving weight, calories, available carbohydrates, total sugars, fat, protein, and fiber. Each value is rounded to a whole unit. Sugars are part of the carbohydrate value and fiber is listed separately. Estimates use a reference recipe or the recognized ingredients. The app uses a typical portion unless a supported weight such as `120 g chicken` or `risotto 350 g` is supplied. Use `dry rice` or `raw rice` to specify uncooked weight. Ingredients outside the reference table may be missing from the estimate. Older records are reinterpreted when loaded. Saving a meal or editing ingredients stores the current estimate.

`getPetState(pet, meals, { now })` derives tummy state and body condition from elapsed time and meal history. `fullness` is a game meter from 0 to 100. Estimated calories affect how much fullness a serving adds. A long stretch with an empty tummy reduces reserves. Repeated large meals while already full build reserves, which can decrease over time. `nutritionalValue` is a game score based on recent meals, weighted by recency over 24 hours. It reflects protein, fiber, and variety. It is `null` until an estimable meal is in that window. An unrecognized meal can still feed the creature. A meal the creature has eaten at least twice can become a craving when peckish. `feedingSpeech(meal, previousMeals, pet)` uses the tummy state before the bite and the creature's food preferences. Disliked meals still count as food.

### Nutrition references

The ingredient data comes from the CREA food-composition tables. Source IDs in the order used in `data/nutrition.js` are `000105`, `000100`, `000805`, `000530`, `000550`, `003030`, `106506`, `110310`, `122400`, `181105`, `004005`, `004105`, `004505`, `005105`, `005155`, `006610`, `005410`, `005300`, `006000`, `007120`, `007510`, `166000`, `190010`, and `009210`. The app combines the per-100 g nutrient values with the estimated or stated portion weights. [CREA food-composition tables](https://www.alimentinutrizione.it/sezioni/tabelle-nutrizionali) · [CREA methodology](https://www.alimentinutrizione.it/presentazione-dati) · [USDA FoodData Central portion guidance](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/)

Prepared dish profiles are based on the CREA values for a standard serving, with pizza using half the reference pizza. Plain risotto uses the Parmesan version as a starting point. Published risotto recipes with different butter and cheese quantities give different values. [Parmesan risotto](https://www.alimentinutrizione.it/tabelle-nutrizionali/PC0009) · [Carbonara](https://www.alimentinutrizione.it/tabelle-nutrizionali/PC0037) · [Bolognese](https://www.alimentinutrizione.it/tabelle-nutrizionali/PC0017) · [Pesto pasta](https://www.alimentinutrizione.it/tabelle-nutrizionali/PC0018) · [Tomato pasta](https://www.alimentinutrizione.it/tabelle-nutrizionali/PC0016) · [Margherita pizza](https://www.alimentinutrizione.it/tabelle-nutrizionali/PC0001) · [Cantonese rice](https://www.alimentinutrizione.it/tabelle-nutrizionali/PE0001) · [Cookidoo risotto recipe](https://cookidoo.it/recipes/recipe/it-IT/r54832)

A feed draft needs a title and a nonempty image file. The feed form checks that the file decodes before saving. Ingredients default to an empty array. Reuse the draft ID for each attempt. A repeated ID returns the original meal and skips the feeding update. Keep the draft until the save resolves.

Domain errors expose `code` and `message`. Adoption can report `UNKNOWN_CREATURE`. Save validation can report `TITLE_REQUIRED`, `PHOTO_REQUIRED`, `INVALID_INGREDIENTS`, `INVALID_MEAL_ID`, or `PET_REQUIRED`. Ingredient edits can also report `MEAL_NOT_FOUND`. Storage can return native browser errors or `STORAGE_BUSY` if another tab is blocking a database upgrade.

IndexedDB version 2 moves photos into their own store and retains existing prototype pets and meals. Persistence is local to the app origin and browser storage profile. Clearing website data can erase the log.
