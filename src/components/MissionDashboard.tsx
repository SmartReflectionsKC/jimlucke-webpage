import { motion } from "motion/react";
import { siteData } from "../data/siteContent";

export function MissionDashboard() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-slate-900 rounded-full blur-[100px] opacity-30"></div>
      
      {/* Center node */}
      <div className="absolute z-10 w-24 h-24 rounded-full border border-white/10 glass-panel flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-white/5 relative">
          <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping"></div>
          <span className="font-display font-semibold text-lg text-white">JL</span>
        </div>
      </div>

      {/* Orbiting nodes */}
      <div className="absolute inset-0">
        {siteData.missionDashboard.map((node, i) => {
          const angle = (i * (360 / siteData.missionDashboard.length)) * (Math.PI / 180);
          // Distance from center
          const radius = 140; 
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const Icon = node.icon;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
              className="absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12 flex items-center justify-center glass-panel rounded-full group cursor-pointer hover:scale-110 transition-transform"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              title={node.label}
            >
              <Icon size={20} className={`${node.color} opacity-80 group-hover:opacity-100`} />
              
              {/* Tooltip */}
              <div className="absolute top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-800 text-xs px-2 py-1 rounded text-slate-200 whitespace-nowrap border border-white/10 z-20">
                {node.label}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Connection lines (simple SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" className="text-white/20" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    </div>
  );
}
