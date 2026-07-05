import { siteData } from "../data/siteContent";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

export function Projects() {
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
              className="glass-panel p-8 flex flex-col h-full group relative overflow-hidden"
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
                
                <a 
                  href={project.link} 
                  className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors self-start mt-auto"
                >
                  {project.cta}
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
