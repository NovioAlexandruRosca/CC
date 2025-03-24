import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BookList from "./BookList";
import BookDetails from "./BookDetails";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/book/:title" element={<BookDetails />} />
      </Routes>
    </Router>
  );
}

export default App;