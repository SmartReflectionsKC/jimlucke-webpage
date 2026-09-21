import { useRef } from "react";
import { ArrowRight, BookOpen, X, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { FieldNoteItem, getFieldNotes } from "../utils/contentLoader";
import { useFocusTrap } from "../utils/useShareableModal";

interface FieldNotesProps {
  activeNote: FieldNoteItem | null;
  onOpenNote: (slug: string, triggerEl?: HTMLElement | null) => void;
  onCloseNote: () => void;
}

export function FieldNotes({ activeNote, onOpenNote, onCloseNote }: FieldNotesProps) {
  const notes = getFieldNotes();
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(Boolean(activeNote), modalRef);

  return (
    <section id="field-notes" className="py-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono mb-3">
              <BookOpen size={12} className="text-amber-400" />
              WRITINGS & REFLECTIONS
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-white">
              Field Notes
            </h2>
            <div className="w-12 h-1 bg-amber-500 rounded-full mt-4 mb-4"></div>
            <p className="text-slate-400 max-w-xl text-base md:text-lg">
              Practical observations and essays from the intersection of technology leadership, community impact, and making useful things.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 self-start md:self-end">
            {notes.length} {notes.length === 1 ? 'Article' : 'Articles'} Published
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note, index) => (
            <motion.div
              key={note.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              tabIndex={0}
              role="button"
              aria-haspopup="dialog"
              onClick={(e) => onOpenNote(note.slug, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenNote(note.slug, e.currentTarget);
                }
              }}
              className="glass-panel p-7 flex flex-col justify-between group cursor-pointer hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.06)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
                  <BookOpen size={18} className="text-slate-400 group-hover:text-amber-400" />
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mb-3">
                  <span className="text-amber-400">{note.category}</span>
                  {note.readTime && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span>{note.readTime}</span>
                    </>
                  )}
                </div>

                <h3 className="text-xl font-display font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-3 mb-3 leading-snug">
                  {note.title}
                </h3>

                {note.summary && (
                  <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-6">
                    {note.summary}
                  </p>
                )}
              </div>
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-medium text-amber-400 group-hover:text-amber-300 mt-auto">
                <span>Read Article</span>
                <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Article Modal Overlay & Dialog */}
      <AnimatePresence>
        {activeNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" role="presentation">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseNote}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
              aria-hidden="true"
            />

            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="field-note-modal-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto glass-panel p-6 md:p-10 bg-slate-900/95 border border-white/10 shadow-2xl z-10 custom-scrollbar focus:outline-none"
            >
              <button
                onClick={onCloseNote}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Close article dialog"
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

                <h1 id="field-note-modal-title" className="text-2xl md:text-4xl font-display font-semibold text-white leading-tight mb-6">
                  {activeNote.title}
                </h1>

                {activeNote.summary && (
                  <p className="text-lg text-slate-300 font-medium border-l-2 border-amber-500/50 pl-4 mb-8 leading-relaxed italic bg-amber-500/5 py-2 rounded-r-lg">
                    {activeNote.summary}
                  </p>
                )}

                {/* Safe Markdown Renderer */}
                <div className="text-slate-300 leading-relaxed text-base md:text-lg">
                  <Markdown
                    components={{
                      h1: ({ ...props }) => (
                        <h2 className="text-2xl md:text-3xl font-display font-semibold text-white mt-10 mb-4" {...props} />
                      ),
                      h2: ({ ...props }) => (
                        <h3 className="text-xl md:text-2xl font-display font-semibold text-white mt-8 mb-4 border-b border-white/5 pb-2" {...props} />
                      ),
                      h3: ({ ...props }) => (
                        <h4 className="text-lg md:text-xl font-display font-medium text-white mt-6 mb-3" {...props} />
                      ),
                      p: ({ ...props }) => <p className="mb-6 leading-relaxed" {...props} />,
                      ul: ({ ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-300" {...props} />,
                      ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-slate-300" {...props} />,
                      li: ({ ...props }) => <li {...props} />,
                      a: ({ href, children, ...props }) => {
                        const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
                        return (
                          <a
                            href={href}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                            className="text-amber-400 hover:text-amber-300 underline underline-offset-4 font-medium transition-colors"
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      },
                      blockquote: ({ ...props }) => (
                        <blockquote className="border-l-4 border-amber-500/50 pl-4 italic text-slate-400 my-6 bg-slate-800/30 py-2 rounded-r-md" {...props} />
                      ),
                      strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />,
                      code: ({ ...props }) => (
                        <code className="bg-slate-800 text-amber-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                      ),
                      img: ({ src, alt, ...props }) => (
                        <figure className="my-8">
                          <img
                            src={src}
                            alt={alt || "Illustration"}
                            loading="lazy"
                            className="rounded-xl border border-white/10 max-h-96 w-full object-cover"
                            {...props}
                          />
                          {alt && <figcaption className="text-xs text-slate-500 italic mt-2 text-center">{alt}</figcaption>}
                        </figure>
                      )
                    }}
                  >
                    {activeNote.content}
                  </Markdown>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">
                    By Jim Lucke
                  </span>
                  <button
                    onClick={onCloseNote}
                    className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
