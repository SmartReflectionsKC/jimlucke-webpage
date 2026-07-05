import { siteData } from "../data/siteContent";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export function CurrentFocus() {
  return (
    <section className="py-20 bg-slate-900/30 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-display font-semibold text-white">Current Focus</h2>
          <div className="w-12 h-1 bg-amber-500 rounded-full mt-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {siteData.currentFocus.map((focus, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-6 flex items-start gap-4 hover:border-amber-500/30 transition-colors group"
            >
              <div className="mt-1">
                <CheckCircle2 size={20} className="text-teal-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-slate-300 font-medium leading-relaxed">
                {focus.title}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
