/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { siteData } from "../data/siteContent";
import { Briefcase, HeartHandshake, Wrench, Quote } from "lucide-react";

export function About() {
  const pillars = [
    {
      icon: Briefcase,
      title: "Technology Leadership",
      description: "Decades spent designing enterprise systems, mentoring teams, and delivering software that served operational reality.",
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      icon: HeartHandshake,
      title: "Community & Nonprofit",
      description: "Dedicated governance and systems support for organizations like SOAR Special Needs and Corvette Club KC.",
      color: "text-teal-400",
      borderColor: "border-teal-500/20",
    },
    {
      icon: Wrench,
      title: "Hands-On Craft",
      description: "Continuous making through practical web applications, visual photography, home automation, and 3D fabrication.",
      color: "text-cyan-400",
      borderColor: "border-cyan-500/20",
    },
  ];

  return (
    <section id="about" className="py-24 bg-slate-900/30 border-y border-white/5 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono mb-3">
            BACKGROUND & PHILOSOPHY
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white">
            About Jim
          </h2>
          <div className="w-12 h-1 bg-amber-500 rounded-full mt-4 mb-8"></div>
        </div>

        {/* Text-led Editorial Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Editorial Story (Left 7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <p className="text-xl md:text-2xl font-display font-medium text-slate-100 leading-snug">
              “My career was spent in technology leadership — retirement didn’t end that curiosity, it redirected it.”
            </p>

            <div className="prose prose-invert prose-slate max-w-none text-slate-300 text-base md:text-lg leading-relaxed">
              <p>
                {siteData.about.copy}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="text-amber-400 font-semibold">Focus:</span>
              <span>Practical Software</span>
              <span className="text-slate-600">•</span>
              <span>Civic Systems</span>
              <span className="text-slate-600">•</span>
              <span>Maker Lab</span>
            </div>
          </div>

          {/* Editorial Callout Card (Right 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/60 relative overflow-hidden">
              <Quote size={32} className="text-amber-500/20 absolute -top-1 -right-1 pointer-events-none" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 font-mono mb-4">
                Guiding Principles
              </h3>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                  <span><strong>Build what is useful:</strong> Avoid technological bloat in favor of simple, reliable tools that people actually adopt.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                  <span><strong>Serve community:</strong> Lend executive technology experience to volunteer teams and nonprofits doing essential frontline work.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0"></span>
                  <span><strong>Never stop learning:</strong> Keep curiosity sharp by bridging digital code with physical workshops, 3D printing, and photography.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Three Editorial Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 pt-12 border-t border-white/5">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-xl glass-panel border border-white/5 flex flex-col gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg bg-slate-800 border ${pillar.borderColor}`}>
                    <Icon size={18} className={pillar.color} />
                  </div>
                  <h4 className="text-sm font-semibold text-white font-display">
                    {pillar.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
