import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Hero from './pages/Hero';
import Home from './pages/Home';
import Detect from './pages/Detect';
import History from './pages/History';
import About from './pages/About';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/app" element={<Layout />}>
        <Route path="home" element={<Home />} />
        <Route path="detect" element={<Detect />} />
        <Route path="history" element={<History />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;
