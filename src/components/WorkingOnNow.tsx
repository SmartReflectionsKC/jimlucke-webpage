import { useState, useRef, useEffect } from "react";
import { siteData, InitiativeItem } from "../data/siteContent";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, X, Sparkles, CheckCircle2, MessageSquare, BookOpen, Layers } from "lucide-react";
import { useFocusTrap } from "../utils/useShareableModal";

interface WorkingOnNowProps {
  onOpenNote?: (slug: string) => void;
}

export function WorkingOnNow({ onOpenNote }: WorkingOnNowProps) {
  const [activeInitiative, setActiveInitiative] = useState<InitiativeItem | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(Boolean(activeInitiative), modalRef);

  useEffect(() => {
    if (activeInitiative) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (triggerRef.current && document.contains(triggerRef.current)) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeInitiative]);

  useEffect(() => {
    if (!activeInitiative) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveInitiative(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeInitiative]);

  const handleCardClick = (e: React.MouseEvent<HTMLElement>, initiative: InitiativeItem) => {
    triggerRef.current = e.currentTarget;
    setActiveInitiative(initiative);
  };

  const handleActionClick = (action: InitiativeItem['actions'][number]) => {
    setActiveInitiative(null);

    if (action.type === 'note' && action.target && onOpenNote) {
      onOpenNote(action.target);
    } else if (action.type === 'anchor' && action.target) {
      const el = document.getElementById(action.target.replace(/^#/, ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (action.type === 'discuss') {
      const mailSubject = encodeURIComponent(action.subject || `Inquiry: ${activeInitiative?.title}`);
      window.location.href = `mailto:${siteData.contact.email}?subject=${mailSubject}`;
    }
  };

  return (
    <section id="working-on" className="py-24 bg-slate-900/40 border-y border-white/5 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            ACTIVE INITIATIVES
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white">
            What I’m Working On Now
          </h2>
          <div className="w-12 h-1 bg-amber-500 rounded-full mt-4 mb-4"></div>
          <p className="text-slate-400 max-w-2xl text-base md:text-lg">
            Focused efforts bridging technology leadership, community service, and hands-on software development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {siteData.workingOnNow.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              tabIndex={0}
              role="button"
              aria-haspopup="dialog"
              onClick={(e) => handleCardClick(e, item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(e as any, item);
                }
              }}
              className="glass-panel p-8 flex flex-col justify-between group relative overflow-hidden cursor-pointer hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4 gap-2">
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-wider px-2.5 py-1 bg-amber-950/60 rounded border border-amber-500/20">
                    {item.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    {item.status}
                  </span>
                </div>

                <h3 className="text-2xl font-display font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                  {item.title}
                </h3>

                <p className="text-sm font-medium text-amber-200/90 mb-4 italic">
                  “{item.tagline}”
                </p>

                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-medium text-amber-400 group-hover:text-amber-300">
                <span>View Initiative Details</span>
                <ArrowUpRight size={16} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Initiative Details Modal Dialog */}
      <AnimatePresence>
        {activeInitiative && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" role="presentation">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInitiative(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Modal Dialog */}
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="working-on-modal-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel p-6 md:p-10 bg-slate-900/95 border border-white/10 shadow-2xl z-10 custom-scrollbar focus:outline-none"
            >
              <button
                onClick={() => setActiveInitiative(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">
                      {activeInitiative.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Status: {activeInitiative.status}
                    </span>
                  </div>
                </div>

                <h3 id="working-on-modal-title" className="text-2xl md:text-3xl font-display font-semibold text-white leading-tight mb-2">
                  {activeInitiative.title}
                </h3>

                <p className="text-base text-amber-300 font-medium italic mb-6">
                  “{activeInitiative.tagline}”
                </p>

                <p className="text-slate-300 leading-relaxed text-base mb-8">
                  {activeInitiative.description}
                </p>

                {activeInitiative.highlights && activeInitiative.highlights.length > 0 && (
                  <div className="mb-8 p-5 rounded-xl bg-slate-800/60 border border-white/5">
                    <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-4 font-semibold">
                      Key Highlights & Architecture
                    </h4>
                    <ul className="space-y-3">
                      {activeInitiative.highlights.map((highlight, index) => {
                        const [title, desc] = highlight.split(": ");
                        return (
                          <li key={index} className="flex gap-3 items-start text-sm text-slate-300">
                            <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-white font-medium">{title}:</strong>
                              {desc && <span className="text-slate-400"> {desc}</span>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Multiple contextual action buttons */}
                <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {activeInitiative.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(action)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                          action.type === 'discuss'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                        }`}
                      >
                        {action.type === 'discuss' ? (
                          <MessageSquare size={14} />
                        ) : action.type === 'note' ? (
                          <BookOpen size={14} />
                        ) : (
                          <Layers size={14} />
                        )}
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveInitiative(null)}
                    className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    Done
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
