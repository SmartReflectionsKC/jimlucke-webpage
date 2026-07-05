import { useState, useEffect } from "react";
import { siteData } from "../data/siteContent";
import { ArrowRight, BookOpen, X, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FieldNoteType {
  title: string;
  category: string;
  date?: string;
  readTime?: string;
  summary?: string;
  content?: string[];
}

export function FieldNotes() {
  const [activeNote, setActiveNote] = useState<FieldNoteType | null>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveNote(null);
      }
    };
    if (activeNote) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [activeNote]);

  return (
    <section id="field-notes" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-3xl font-display font-semibold text-white">Field Notes</h2>
            <div className="w-12 h-1 bg-amber-500 rounded-full mt-4 mb-4"></div>
            <p className="text-slate-400 max-w-xl">
              Practical notes from the intersection of technology, community, photography, and useful ideas.
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById("field-notes");
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
          >
            View All Notes <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {siteData.fieldNotes.map((note, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveNote(note)}
              className="glass-panel p-6 flex flex-col group cursor-pointer hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
                <BookOpen size={18} className="text-slate-400 group-hover:text-amber-400" />
              </div>
              
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mb-3">
                <span>{note.category}</span>
                {note.readTime && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>{note.readTime}</span>
                  </>
                )}
              </div>
              
              <h3 className="text-lg font-display font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-3 mb-4">
                {note.title}
              </h3>
              
              {note.summary && (
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-6 mt-auto">
                  {note.summary}
                </p>
              )}
              
              <span className="text-xs font-medium text-amber-500 group-hover:text-amber-400 inline-flex items-center gap-1.5 mt-auto">
                Read Article <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Article Modal Overlay & Dialog */}
      <AnimatePresence>
        {activeNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveNote(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Modal Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto glass-panel p-6 md:p-10 bg-slate-900/90 border border-white/10 shadow-2xl z-10 custom-scrollbar"
            >
              <button
                onClick={() => setActiveNote(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div className="max-w-2xl mx-auto">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-amber-400 mb-6">
                  <span className="px-2.5 py-1 bg-amber-500/10 rounded-md border border-amber-500/20 uppercase tracking-wider font-semibold">
                    {activeNote.category}
                  </span>
                  {activeNote.date && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={14} />
                      {activeNote.date}
                    </span>
                  )}
                  {activeNote.readTime && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={14} />
                      {activeNote.readTime}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-4xl font-display font-semibold text-white leading-tight mb-6">
                  {activeNote.title}
                </h2>

                {activeNote.summary && (
                  <p className="text-lg text-slate-300 font-medium border-l-2 border-amber-500/50 pl-4 mb-8 leading-relaxed italic">
                    {activeNote.summary}
                  </p>
                )}

                <div className="space-y-6 text-slate-300 leading-relaxed text-base md:text-lg">
                  {activeNote.content?.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
                  <span className="text-sm font-display text-slate-500">
                    By Jim Lucke
                  </span>
                  <button
                    onClick={() => setActiveNote(null)}
                    className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/5"
                  >
                    Close Article
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
