# Scraps data layer

The app calls the storage API through `store.js`. That module forwards requests to `data/scraps.js` and retains the prototype's one-shot save failure control. Run the app on HTTPS or localhost.

| Function | Resolves to |
| --- | --- |
| `load()` | `{ pet, meals }`, with a null pet before adoption |
| `adopt()` | The new or existing pet. Repeated calls return the same creature |
| `saveMeal({ id, title, photo, ingredients })` | `{ pet, meal }` after the meal, photo, and feeding update commit together |
| `updateIngredients(id, ingredients)` | The updated meal. Pass an empty array to clear the ingredients |

A pet has `id`, `name`, `adoptedAt`, `lastFedAt`, and `mealsFed`. The app derives the creature's appearance and reactions from the pet and its meal history. A meal has `id`, `title`, `eatenAt`, `ingredients`, and a photo `Blob`. Timestamps are UTC ISO strings. Group meal dates in the player's local timezone.

A feed draft needs a title and a nonempty image file. The feed form checks that the file decodes before saving. Ingredients default to an empty array. Reuse the draft ID for each attempt. A repeated ID returns the original meal and skips the feeding update. Keep the draft until the save resolves.

Domain errors expose `code` and `message`. Save validation can report `TITLE_REQUIRED`, `PHOTO_REQUIRED`, `INVALID_INGREDIENTS`, `INVALID_MEAL_ID`, or `PET_REQUIRED`. Ingredient edits can also report `MEAL_NOT_FOUND`. Storage can return native browser errors or `STORAGE_BUSY` if another tab is blocking a database upgrade.

IndexedDB version 2 moves photos into their own store and retains existing prototype pets and meals. Persistence is local to the app origin and browser storage profile. Clearing website data can erase the log. Cloud sync, dietary interpretation, and body changes remain future features.
