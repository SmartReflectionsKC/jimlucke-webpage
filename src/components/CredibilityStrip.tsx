/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Briefcase, Code2, HeartHandshake, Layers } from "lucide-react";

export function CredibilityStrip() {
  const items = [
    {
      icon: Briefcase,
      title: "30+ Years in Technology Leadership",
      subtitle: "Technology leadership, systems, and operations",
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      icon: Code2,
      title: "Building Practical Software",
      subtitle: "Single-purpose tools & community platforms",
      color: "text-cyan-400",
      borderColor: "border-cyan-500/20",
    },
    {
      icon: HeartHandshake,
      title: "Board Chair, SOAR Special Needs",
      subtitle: "Supporting families & the Life Center vision",
      color: "text-teal-400",
      borderColor: "border-teal-500/20",
    },
    {
      icon: Layers,
      title: "Community, Photography & Maker Projects",
      subtitle: "Automotive heritage, 3D printing & creative media",
      color: "text-purple-400",
      borderColor: "border-purple-500/20",
    },
  ];

  return (
    <section
      aria-label="Background and key focus areas"
      className="relative z-10 border-y border-white/5 bg-slate-950/70 backdrop-blur-md py-6 sm:py-7"
    >
      <div className="max-w-7xl mx-auto px-6">
        <ul
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={i}
                className="flex items-start gap-3.5 p-3 sm:p-4 rounded-xl glass-panel border border-white/5 hover:border-white/15 transition-colors"
              >
                <div
                  className={`mt-0.5 p-2 rounded-lg bg-slate-900 border ${item.borderColor} shrink-0`}
                  aria-hidden="true"
                >
                  <Icon size={18} className={item.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
