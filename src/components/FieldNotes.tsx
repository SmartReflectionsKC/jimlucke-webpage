import { siteData } from "../data/siteContent";
import { ArrowRight, BookOpen } from "lucide-react";
import { motion } from "motion/react";

export function FieldNotes() {
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
          <a href="#" className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
            View All Notes <ArrowRight size={16} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {siteData.fieldNotes.map((note, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-6 flex flex-col group cursor-pointer hover:border-amber-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
                <BookOpen size={18} className="text-slate-400 group-hover:text-amber-400" />
              </div>
              
              <span className="text-xs font-mono text-slate-400 mb-3">
                {note.category}
              </span>
              
              <h3 className="text-lg font-display font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-3">
                {note.title}
              </h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
