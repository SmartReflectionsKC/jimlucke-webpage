/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { siteData } from "../data/siteContent";
import { ArrowRight, Hammer, Code2, HeartHandshake, Camera } from "lucide-react";
import { handleSectionNavigation } from "../utils/navigation";

export function Hero() {
  const visualCues = [
    {
      icon: Code2,
      label: "Practical Software",
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      bgBadge: "bg-slate-900/90",
      desktopPosition: "lg:absolute lg:-top-3 lg:-left-6",
    },
    {
      icon: HeartHandshake,
      label: "Community & Nonprofits",
      color: "text-teal-400",
      borderColor: "border-teal-500/30",
      bgBadge: "bg-slate-900/90",
      desktopPosition: "lg:absolute lg:top-1/2 lg:-right-6 lg:-translate-y-1/2",
    },
    {
      icon: Camera,
      label: "Photography & Workshop",
      color: "text-amber-400",
      borderColor: "border-amber-500/30",
      bgBadge: "bg-slate-900/90",
      desktopPosition: "lg:absolute lg:-bottom-3 lg:-left-2",
    },
  ];

  return (
    <section className="relative pt-32 pb-16 md:pt-44 md:pb-24 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* 58/42 desktop split (7 cols / 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">

          {/* Left text column (~58% width on desktop) */}
          <div className="lg:col-span-7 flex flex-col items-start">
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
          </div>

          {/* Right visual column (~42% width on desktop, stacked below CTAs on mobile) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
              {/* Subtle ambient lighting backdrop */}
              <div
                className="absolute -inset-3 bg-gradient-to-tr from-amber-500/15 via-transparent to-cyan-500/15 rounded-3xl blur-2xl -z-10 pointer-events-none"
                aria-hidden="true"
              ></div>

              {/* Modern Restrained Portrait Panel */}
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden glass-panel p-2.5 shadow-2xl border border-white/10 bg-slate-900/80">
                <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-950">
                  <img
                    src="/images/jim-lucke.jpeg"
                    alt="Jim Lucke portrait"
                    className="w-full h-full object-cover object-top filter grayscale contrast-[1.05]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.endsWith('.jpeg')) {
                        target.src = '/images/jim-lucke.jpg';
                      }
                    }}
                  />
                  {/* Subtle tonal vignette gradient overlay */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none"
                    aria-hidden="true"
                  ></div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono pointer-events-none">
                    <span className="text-slate-400">Jim Lucke</span>
                    <span className="text-amber-400/80">Builder & Technologist</span>
                  </div>
                </div>
              </div>

              {/* Desktop Floating Cue Badges (positioned cleanly outside face area) */}
              <div className="hidden lg:block pointer-events-none">
                {visualCues.map((cue, idx) => {
                  const Icon = cue.icon;
                  return (
                    <div
                      key={idx}
                      className={`${cue.desktopPosition} z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${cue.bgBadge} border ${cue.borderColor} shadow-xl backdrop-blur-md transition-transform hover:scale-105 pointer-events-auto`}
                    >
                      <Icon size={14} className={cue.color} />
                      <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
                        {cue.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile / Tablet Supporting Cues (rendered inline below portrait to never obscure face) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 lg:hidden">
              {visualCues.map((cue, idx) => {
                const Icon = cue.icon;
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${cue.bgBadge} border ${cue.borderColor} shadow-md`}
                  >
                    <Icon size={13} className={cue.color} />
                    <span className="text-xs font-medium text-slate-200">
                      {cue.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
