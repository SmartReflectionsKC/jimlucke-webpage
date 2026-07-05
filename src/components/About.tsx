import { siteData } from "../data/siteContent";
import { motion } from "motion/react";

export function About() {
  return (
    <section id="about" className="py-24 bg-slate-900/30 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5"
          >
            <div className="relative aspect-[4/5] max-w-md mx-auto lg:mx-0 rounded-2xl overflow-hidden glass-panel p-2">
              <div className="w-full h-full rounded-xl bg-slate-800 relative overflow-hidden">
                {/* Fallback image style / abstract shape */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                
                {/* Image element if actual image exists */}
                <img 
                  src="/images/jim-lucke.jpg" 
                  alt="Jim Lucke" 
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80"
                  onError={(e) => {
                    // Hide if missing
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 lg:pl-12"
          >
            <h2 className="text-3xl font-display font-semibold text-white mb-4">About Jim</h2>
            <div className="w-12 h-1 bg-amber-500 rounded-full mb-8"></div>
            
            <div className="prose prose-invert prose-slate max-w-none">
              <p className="text-lg text-slate-300 leading-relaxed">
                {siteData.about.copy}
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
