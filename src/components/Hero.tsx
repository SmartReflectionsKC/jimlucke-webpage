import { siteData } from "../data/siteContent";
import { MissionDashboard } from "./MissionDashboard";
import { motion } from "motion/react";
import { ArrowRight, Hammer } from "lucide-react";
import { handleSectionNavigation } from "../utils/navigation";

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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Personal Innovation Portfolio
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-semibold text-white leading-[1.15] mb-6">
              Retired from corporate technology.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                Not retired from building things.
              </span>
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed max-w-xl mb-10">
              {siteData.hero.subheadline}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#projects"
                onClick={(e) => handleSectionNavigation(e, '#projects')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Explore My Projects
                <ArrowRight size={18} />
              </a>
              <a
                href="#working-on"
                onClick={(e) => handleSectionNavigation(e, '#working-on')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-medium transition-colors border border-white/10 hover:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <Hammer size={18} className="text-amber-400" />
                What I’m Working On
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
