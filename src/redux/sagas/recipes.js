import {
  all,
  call,
  fork,
  select,
  takeEvery,
  take,
  cancel,
  put,
} from "redux-saga/effects";

import {
  types,
  syncRecipes,
  selectRecipe,
  setPhotoUrl,
  saveRecipeSuccessful,
} from "../actions/recipes";
import { push } from "connected-react-router";

import rsf from "../rsf";

function* saveRecipe() {
  const user = yield select((state) => state.login.user);
  const newRecipe = yield select((state) => state.recipes.selected);
  const recipeId = newRecipe.id || getRecipeID(newRecipe.name);

  const res = yield call(rsf.database.patch, `test_recipes/${recipeId}`, {
    ...newRecipe,
    creator: user ? user.uid : null,
    approved: false,
  });

  console.log("# Save categories");
  const categories = newRecipe.categories;
  if (categories != null) {
    var category;
    for (category in categories) {
      yield call(rsf.database.patch, `test_recipesByCategories/${category}`, {
        [recipeId]: true,
      });
    }
  }

  console.log("# Save allergens");
  const allergens = newRecipe.allergens;
  if (allergens != null && allergens.length > 0) {
    var allergen;
    for (allergen in allergens) {
      yield call(rsf.database.patch, `test_recipesByAllergies/${allergen}`, {
        [recipeId]: true,
      });
    }
  } else {
    yield call(rsf.database.patch, `test_recipesByAllergies/allergensFree`, {
      [recipeId]: true,
    });
  }
  console.log("# Save hashtags"); // -> -> it must contain all the ingredients name and the substrings from the recipe name
  var hashTags = [];
  var noDiacritisc = newRecipe.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  hashTags = noDiacritisc.toLowerCase().split(/[ ,]+/);

  const ingredients = newRecipe.ingredients;
  if (ingredients != null) {
      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        var ingredientName = ingredient.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        hashTags.push(ingredientName.toLowerCase());
      }
  }

  console.log("Hash tags: ", {hashTags});

  for (let i = 0; i < hashTags.length; i++) {
    var tag = hashTags[i];
    yield call(rsf.database.patch, `test_hashTags_ro/${tag}`, {
      [recipeId]: true,
    });
  }
  
  console.log("# SAGA saveRecipe:", { user, newRecipe, res });
  yield put(saveRecipeSuccessful());
  yield put(push("/"));
}

function* setRecipeStatus(action) {
  yield call(rsf.database.patch, `recipes_web/${action.recipeId}`, {
    done: action.done,
  });
}

const recipesTransformer = ({ value }) => {
  return Object.keys(value).map((key) => ({
    ...value[key],
    id: key,
  }));
};

function* waitFor(selector) {
  if (yield select(selector)) return; // (1)

  while (true) {
    yield take("*"); // (1a)
    if (yield select(selector)) return; // (1b)
  }
}

function* selectRecipeSaga({ recipeId }) {
  yield call(waitFor, (state) => state.recipes.list[0]);

  const recipes = yield select((state) => state.recipes.list);

  const recipe = recipes.find((item) => {
    return item.id === recipeId;
  });
  yield put(selectRecipe(recipe));
}

function* syncRecipesSaga() {
  // Start the sync saga
  let task = yield fork(rsf.database.sync, "recipes_web", {
    successActionCreator: syncRecipes,
    transform: recipesTransformer,
  });

  // Wait for the logout action, then stop sync
  yield take("LOGOUT");
  yield cancel(task);
}
function stringToSlug(str) {
  if (str == null || str.length <= 0) {
    return "";
  }

  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to = "aaaaeeeeiiiioooouuuunc------";
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "_") // collapse whitespace and replace by _
    .replace(/_+/g, "_"); // collapse dashes
  return str;
}

function getRecipeID(str) {
  var slug = stringToSlug(str);
  const timestampStr = Date.now().toString();
  const recipeId = timestampStr.concat("_").concat(slug);
  return recipeId;
}

function* syncPhotoUrl(filePath) {
  try {
    const url = yield call(rsf.storage.getDownloadURL, filePath);
    yield put(setPhotoUrl(url));
  } catch (error) {
    console.error(error);
  }
}

function* uploadFileSaga(action) {
  const recipes = yield select((state) => state.recipes);
  const file = recipes.photoFile;
  const filePath = `recipes/${getRecipeID(recipes.selected.name)}-${
    file.name
  }`;
  const task = rsf.storage.uploadFile(filePath, file);

  task.on("state_changed", (snapshot) => {
    const percentage = (snapshot.bytesTransferred * 100) / snapshot.totalBytes;
    console.log(`${percentage}%`);
  });

  yield task;

  yield call(syncPhotoUrl, filePath);
}

export default function* rootSaga() {
  yield all([
    fork(syncRecipesSaga),
    takeEvery(types.RECIPE.SAVE, saveRecipe),
    takeEvery(types.RECIPES.SET_STATUS, setRecipeStatus),
    takeEvery(types.RECIPE.FIND, selectRecipeSaga),
    takeEvery(types.RECIPE.UPLOAD_FILE, uploadFileSaga),
  ]);
}
