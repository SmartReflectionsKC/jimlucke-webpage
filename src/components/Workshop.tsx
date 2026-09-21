import { useState, useRef, useEffect } from "react";
import { siteData, WorkshopItem } from "../data/siteContent";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowUpRight, X, CheckCircle2, Wrench } from "lucide-react";
import { useFocusTrap } from "../utils/useShareableModal";
import { getCardMotionProps } from "../utils/motion";

export function Workshop() {
  const shouldReduceMotion = useReducedMotion();
  const [activeItem, setActiveItem] = useState<WorkshopItem | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(Boolean(activeItem), modalRef);

  useEffect(() => {
    if (activeItem) {
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
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem]);

  const handleCardClick = (e: React.MouseEvent<HTMLElement>, item: WorkshopItem) => {
    triggerRef.current = e.currentTarget;
    setActiveItem(item);
  };

  return (
    <section id="workshop" className="py-24 bg-slate-900/30 border-y border-white/5 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-3">
            <Wrench size={12} className="text-cyan-400" />
            MAKER LAB & EXPERIMENTS
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white">
            The Workshop
          </h2>
          <div className="w-12 h-1 bg-cyan-500 rounded-full mt-4 mb-4"></div>
          <p className="text-slate-400 max-w-2xl text-base md:text-lg">
            Where practical software prototypes, local-first home automation, 3D printing, and hardware experiments take shape.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {siteData.workshop.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={item.id}
                {...getCardMotionProps(index, Boolean(shouldReduceMotion))}
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
                className="glass-panel p-8 flex flex-col justify-between group relative overflow-hidden cursor-pointer hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.08)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <IconComponent size={24} />
                    </div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider px-2.5 py-1 bg-cyan-950/60 rounded border border-cyan-500/20">
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-display font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {item.tags.map((tag, i) => (
                      <span key={i} className="text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-white/5 font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-medium text-cyan-400 group-hover:text-cyan-300">
                  <span>Explore Workshop Details</span>
                  <ArrowUpRight size={16} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Workshop Details Dialog */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" role="presentation">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
              aria-hidden="true"
            />

            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="workshop-modal-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel p-6 md:p-10 bg-slate-900/95 border border-white/10 shadow-2xl z-10 custom-scrollbar focus:outline-none"
            >
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <activeItem.icon size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                      {activeItem.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Status: {activeItem.status}
                    </span>
                  </div>
                </div>

                <h3 id="workshop-modal-title" className="text-2xl md:text-3xl font-display font-semibold text-white leading-tight mb-4">
                  {activeItem.title}
                </h3>

                <p className="text-slate-300 leading-relaxed text-base mb-8">
                  {activeItem.description}
                </p>

                {activeItem.details && (
                  <div className="space-y-4 mb-8">
                    <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-semibold">
                      Workshop Focus & Capabilities
                    </h4>
                    <ul className="space-y-3">
                      {activeItem.details.map((detail, idx) => {
                        const [title, desc] = detail.split(": ");
                        return (
                          <li key={idx} className="flex gap-3 items-start text-sm text-slate-300">
                            <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
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

                <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5">
                  {activeItem.tags.map((tag, i) => (
                    <span key={i} className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => setActiveItem(null)}
                    className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
