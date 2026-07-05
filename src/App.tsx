/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { CurrentFocus } from "./components/CurrentFocus";
import { Projects } from "./components/Projects";
import { Photography } from "./components/Photography";
import { FieldNotes } from "./components/FieldNotes";
import { About } from "./components/About";
import { Connect } from "./components/Connect";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <CurrentFocus />
        <Projects />
        <Photography />
        <FieldNotes />
        <About />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}

