import { useState, useEffect } from "react";
import { siteData } from "../data/siteContent";
import { ArrowUpRight, X, Sparkles, CheckCircle2, Heart, Cpu, HelpCircle, Code2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProjectType {
  title: string;
  category: string;
  description: string;
  tags: string[];
  status: string;
  cta: string;
  link: string;
  details?: string[];
  story?: string;
}

export function Projects() {
  const [activeProject, setActiveProject] = useState<ProjectType | null>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveProject(null);
      }
    };
    if (activeProject) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [activeProject]);

  const handleProjectClick = (e: React.MouseEvent, project: ProjectType) => {
    if (project.link.startsWith("#") && project.link.length > 1) {
      // It's a real anchor link (e.g. #photography). Let's smooth scroll!
      e.preventDefault();
      const element = document.getElementById(project.link.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (project.link === "#") {
      // It's a modal project. Prevent default and show modal.
      e.preventDefault();
      setActiveProject(project);
    }
  };

  // Helper to get matching icons for categories in the modal
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("software")) return <Code2 className="text-cyan-400" size={24} />;
    if (cat.includes("nonprofit")) return <Heart className="text-rose-400" size={24} />;
    if (cat.includes("home") || cat.includes("automation")) return <Cpu className="text-amber-400" size={24} />;
    if (cat.includes("story") || cat.includes("photography")) return <Camera className="text-purple-400" size={24} />;
    return <Sparkles className="text-cyan-400" size={24} />;
  };

  return (
    <section id="projects" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-3xl font-display font-semibold text-white">Things I’m Building / Supporting</h2>
          <div className="w-12 h-1 bg-cyan-500 rounded-full mt-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {siteData.projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={(e) => handleProjectClick(e, project)}
              className="glass-panel p-8 flex flex-col h-full group relative overflow-hidden cursor-pointer hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.05)] transition-all duration-300"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider px-2 py-1 bg-cyan-950/50 rounded border border-cyan-500/20">
                    {project.category}
                  </span>
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {project.status}
                  </span>
                </div>
                
                <h3 className="text-2xl font-display font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  {project.title}
                </h3>
                
                <p className="text-slate-400 leading-relaxed mb-8 flex-grow">
                  {project.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {project.tags.map((tag, i) => (
                    <span key={i} className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <button 
                  onClick={(e) => handleProjectClick(e, project)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors self-start mt-auto bg-transparent border-none p-0 cursor-pointer"
                >
                  {project.cta}
                  <ArrowUpRight size={16} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project Details Modal */}
      <AnimatePresence>
        {activeProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProject(null)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel p-6 md:p-10 bg-slate-900/95 border border-white/10 shadow-2xl z-10 custom-scrollbar"
            >
              <button
                onClick={() => setActiveProject(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
                    {getCategoryIcon(activeProject.category)}
                  </div>
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                      {activeProject.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Status: {activeProject.status}
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-display font-semibold text-white leading-tight mb-4">
                  {activeProject.title}
                </h2>

                <p className="text-slate-300 leading-relaxed text-base md:text-lg mb-8">
                  {activeProject.description}
                </p>

                {activeProject.story && (
                  <div className="mb-8 p-5 rounded-xl bg-cyan-950/20 border border-cyan-500/10">
                    <h4 className="text-xs font-mono uppercase text-cyan-400 tracking-wider mb-2 font-semibold">
                      The Purpose & Story
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed italic">
                      "{activeProject.story}"
                    </p>
                  </div>
                )}

                {activeProject.details && activeProject.details.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-semibold">
                      Key Highlights & Systems
                    </h4>
                    <ul className="space-y-3">
                      {activeProject.details.map((detail, index) => {
                        const [title, desc] = detail.split(": ");
                        return (
                          <li key={index} className="flex gap-3 items-start text-sm text-slate-300">
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

                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/5">
                  {activeProject.tags.map((tag, i) => (
                    <span key={i} className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => setActiveProject(null)}
                    className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors"
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

