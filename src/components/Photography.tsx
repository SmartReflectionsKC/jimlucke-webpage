import { siteData } from "../data/siteContent";
import { motion } from "motion/react";

export function Photography() {
  return (
    <section id="photography" className="py-24 bg-slate-900/50 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-3xl font-display font-semibold text-white">Visual Stories</h2>
          <div className="w-12 h-1 bg-purple-500 rounded-full mt-4"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {siteData.photography.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative aspect-square md:aspect-[4/5] rounded-xl overflow-hidden bg-slate-800"
            >
              {/* Image with fallback gradient if not found */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ 
                  backgroundImage: `url(${item.image}), linear-gradient(to bottom right, #1e293b, #0f172a)` 
                }}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-display font-medium text-white mb-2">
                    {item.title}
                  </h3>
                  <div className="w-8 h-0.5 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
