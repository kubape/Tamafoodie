# Scraps prototype

Scraps is a mobile-first virtual pet fed with photos of meals the player ate. The prototype is plain HTML, CSS, and JavaScript. Pet progress, meal metadata, and original photo files live in IndexedDB on the device.

## Run and install

Run `python3 -m http.server 8000` from the repository root and open `http://localhost:8000`. Add `?demo=1` to expose the mood controls and the **Simulate a failed save** checkbox. For the empty adoption flow, open a fresh browser profile or use a new local port.

For GitHub Pages, set **Settings → Pages → Deploy from a branch** to `main` and `/ (root)`. Open the resulting `/Tamafoodie/` URL in Safari and select **Share → Add to Home Screen**. The manifest requests standalone display and includes the app icon. [GitHub Pages publishing setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [WebKit Home Screen behavior](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

## Screens and interactions

- **Adopt and pet home.** Adopt Scraps to hatch the egg and reveal the hungry creature. Feed stays within thumb reach on the pet screen. Hungry, recently fed, and craving each have different ASCII art and screen reader descriptions. Scraps grows tufts after three meals.
- **Feed.** Take a photo or choose one from the library. Preview it, supply a title, and optionally add ingredients separated by commas or new lines. A successful save returns to the habitat for a short creature reaction. A failed save keeps the photo, title, and ingredients ready to retry. Drafts stay in memory for the current session.
- **Meal history and detail.** History starts empty and groups saved meals newest first by the device’s local date. Thumbnails, titles, and times support scanning. Open a meal to see the full photo and add, edit, or clear its ingredients.

## Data records and storage

| Record | Fields |
| --- | --- |
| Pet | `id`, `name`, `adoptedAt`, `lastFedAt` (nullable), `mealsFed` |
| Meal | `id`, `title`, `ingredients` (`string[]`), `photo` (`File` or `Blob`), `eatenAt` |
| Creature view | `mood`, `label`, `title`, `line`, `description`, `art` |

Timestamps are ISO strings. `eatenAt` uses save time in this prototype. In `creature.js`, Scraps stays full for four hours after a meal, then craves its most frequently logged dish until 18 hours after feeding. Ties favor the dish eaten most recently. Reactions use mock text and recognize repeat titles.

`store.js` connects the screens to the IndexedDB data layer. The meal ID exists before submission so retries can reuse it. The meal, photo, and pet update commit together. The view creates object URLs from stored photos. See the [storage API](data/README.md) for the data contract and upgrade behavior.

For a future cloud service, keep the storage methods in `store.js` as the interface for the screens. The `getCreature()` and `mealReaction()` calls in `app.js` are the integration points for server-calculated moods, cravings, and reactions.
