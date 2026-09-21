/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { CredibilityStrip } from "./components/CredibilityStrip";
import { WorkingOnNow } from "./components/WorkingOnNow";
import { Projects } from "./components/Projects";
import { Workshop } from "./components/Workshop";
import { Photography } from "./components/Photography";
import { FieldNotes } from "./components/FieldNotes";
import { About } from "./components/About";
import { Connect } from "./components/Connect";
import { Footer } from "./components/Footer";
import { useShareableModal } from "./utils/useShareableModal";

export default function App() {
  const {
    activeNote,
    activeGallery,
    openNote,
    openGallery,
    closeModal,
  } = useShareableModal();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      <main>
        <Hero />
        <CredibilityStrip />
        <WorkingOnNow onOpenNote={openNote} />
        <Projects />
        <Workshop />
        <Photography
          activeGallery={activeGallery}
          onOpenGallery={openGallery}
          onCloseGallery={closeModal}
        />
        <FieldNotes
          activeNote={activeNote}
          onOpenNote={openNote}
          onCloseNote={closeModal}
        />
        <About />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}
