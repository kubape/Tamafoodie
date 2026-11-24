# Scraps data layer

The app calls the storage API through `store.js`. That module forwards requests to `data/scraps.js` and retains the prototype's one-shot save failure control. Run the app on HTTPS or localhost.

| Function | Resolves to |
| --- | --- |
| `load()` | `{ pet, meals }`, with a null pet before adoption |
| `adopt({ variant, name })` | The new or existing pet. Repeated calls return the same creature |
| `saveMeal({ id, title, photo, ingredients })` | `{ pet, meal }` after the meal, photo, and feeding update commit together |
| `updateIngredients(id, ingredients)` | The updated meal. Pass an empty array to clear the ingredients |

A pet has `id`, `name`, `variant`, `adoptedAt`, `lastFedAt`, and `mealsFed`. Valid variant IDs and their food preferences are in `data/game.js`. Older pets without a variant use Crumb's appearance and preferences. A meal has `id`, `title`, `eatenAt`, `ingredients`, a photo `Blob`, and `nutrition` with a `kind` and food `tags`. Timestamps are UTC ISO strings. Group meal dates in the player's local timezone.

`interpretMeal()` uses the title and optional ingredients to estimate `light`, `balanced`, `rich`, or `unknown` for the game. Unknown meals provide a moderate amount of fullness. Saving a meal or editing its ingredients updates the estimate. Older records get an estimate when loaded.

`getPetState(pet, meals, { now })` derives tummy state and body condition from elapsed time and meal history. A long stretch with an empty tummy reduces reserves. Repeated large meals while already full build reserves, which can decrease over time. A meal the creature has eaten at least twice can become a craving when peckish. `feedingSpeech(meal, previousMeals, pet)` uses the tummy state before the bite and the creature's food preferences. Disliked meals still count as food.

A feed draft needs a title and a nonempty image file. The feed form checks that the file decodes before saving. Ingredients default to an empty array. Reuse the draft ID for each attempt. A repeated ID returns the original meal and skips the feeding update. Keep the draft until the save resolves.

Domain errors expose `code` and `message`. Adoption can report `UNKNOWN_CREATURE`. Save validation can report `TITLE_REQUIRED`, `PHOTO_REQUIRED`, `INVALID_INGREDIENTS`, `INVALID_MEAL_ID`, or `PET_REQUIRED`. Ingredient edits can also report `MEAL_NOT_FOUND`. Storage can return native browser errors or `STORAGE_BUSY` if another tab is blocking a database upgrade.

IndexedDB version 2 moves photos into their own store and retains existing prototype pets and meals. Persistence is local to the app origin and browser storage profile. Clearing website data can erase the log.
