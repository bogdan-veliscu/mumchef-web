import React from "react";
import "./App.css";
import HomePage from "./pages/HomePage";
import { Route, Switch } from "react-router-dom";
import Header from "./common/Header";
import { ToastContainer } from "react-toastify";

import AboutPage from "./pages/AboutPage";
import RecipesPage from "./pages/RecipesPage";
import EditRecipePage from "./pages/EditRecipePage";

function App() {
  return (
    <div className='container-fluid'>
      <Header />
      <Switch>
        <Route exact path='/' component={HomePage} />
        <Route path='/about' component={AboutPage} />
        <Route path='/recipes' component={RecipesPage} />
        <Route path='/recipe/:id' component={EditRecipePage} />
      </Switch>
    </div>
  );
}

export default App;