import { siteData } from "../data/siteContent";
import { MissionDashboard } from "./MissionDashboard";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Digital Workshop
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-white leading-tight mb-6">
              Building practical technology, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">visual stories</span>, and community tools.
            </h1>
            
            <p className="text-lg text-slate-400 leading-relaxed max-w-xl mb-10">
              {siteData.hero.subtitle}
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <a href="#projects" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium transition-colors">
                Explore Projects
                <ArrowRight size={18} />
              </a>
              <a href="#connect" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors border border-slate-700">
                Connect with Jim
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex justify-center"
          >
            <MissionDashboard />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
