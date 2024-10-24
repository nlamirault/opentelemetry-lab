import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Home } from "./Home";
import { NoMatch } from "./NoMatch";
import { Version } from "./Version";

const RouterComponent = (): JSX.Element => (
  <Routes>
    <Route path="/" element={<Home />}></Route>
    <Route path="version" element={<Version />} />
    <Route path="*" element={<NoMatch />} />
  </Routes>
);

const RouterExporter = (): JSX.Element => (
  <Router>
    <RouterComponent />
  </Router>
);

export default RouterExporter;
