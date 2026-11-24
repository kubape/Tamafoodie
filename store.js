import { adopt, load, saveMeal, updateIngredients } from './data/scraps.js';

let failNextMeal = false;

export const store = {
  load,
  adopt,
  updateIngredients,

  async saveMeal(draft) {
    if (failNextMeal) {
      failNextMeal = false;
      throw new Error('Simulated meal save failure.');
    }
    return saveMeal(draft);
  },

  simulateNextMealFailure() {
    failNextMeal = true;
  },
};
