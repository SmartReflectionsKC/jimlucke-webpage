/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { siteData } from "../data/siteContent";
import { Mail, MessageSquare, Heart, Camera, Linkedin, ArrowUpRight } from "lucide-react";

export function Connect() {
  const emailOptions = [
    {
      icon: Mail,
      title: "Direct Email",
      desc: "General inquiries, greetings, and introductions.",
      actionLabel: "Say Hello",
      href: `mailto:${siteData.contact.email}?subject=${encodeURIComponent("Saying Hello")}`,
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      icon: MessageSquare,
      title: "Project Conversation",
      desc: "Software ideas, architecture, and technical collaboration.",
      actionLabel: "Discuss a Project",
      href: `mailto:${siteData.contact.email}?subject=${encodeURIComponent("Discussing a Project")}`,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/20",
    },
    {
      icon: Heart,
      title: "Nonprofit & Community",
      desc: "SOAR Special Needs, Corvette Club KC, and civic initiatives.",
      actionLabel: "Discuss Community Work",
      href: `mailto:${siteData.contact.email}?subject=${encodeURIComponent("Discussing Community Work")}`,
      color: "text-teal-400",
      borderColor: "border-teal-500/20",
    },
    {
      icon: Camera,
      title: "Photography & Media",
      desc: "Visual storytelling, photojournalism, and creative prints.",
      actionLabel: "Discuss Photography",
      href: `mailto:${siteData.contact.email}?subject=${encodeURIComponent("Discussing Photography")}`,
      color: "text-purple-400",
      borderColor: "border-purple-500/20",
    },
  ];

  const isValidLinkedInUrl = Boolean(
    siteData.contact.linkedin &&
    siteData.contact.linkedin.trim().length > 0 &&
    (siteData.contact.linkedin.startsWith("https://") || siteData.contact.linkedin.startsWith("http://"))
  );

  return (
    <section id="connect" className="py-24 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono mb-3">
          START A CONVERSATION
        </div>
        <h2 className="text-3xl font-display font-semibold text-white mb-4">Let's Connect</h2>
        <div className="w-12 h-1 bg-amber-500 rounded-full mx-auto mb-8"></div>

        <p className="text-slate-400 mb-12 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          Whether you want to discuss a practical software idea, community initiative, or photography project, I’m always open to a thoughtful conversation.
        </p>

        {/* Four Email Pathways */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
          {emailOptions.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <div
                key={i}
                className="glass-panel p-6 rounded-2xl flex flex-col justify-between group hover:border-white/20 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-slate-900 border ${opt.borderColor}`}>
                      <Icon size={20} className={opt.color} />
                    </div>
                    <h3 className="font-semibold text-white text-base">{opt.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">{opt.desc}</p>
                </div>

                <a
                  href={opt.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${opt.color} hover:underline pt-3 border-t border-white/5`}
                >
                  <span>{opt.actionLabel}</span>
                  <ArrowUpRight size={15} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            );
          })}
        </div>

        {/* Configurable LinkedIn Card: Only visible when a valid profile URL is configured */}
        {isValidLinkedInUrl && (
          <div className="mt-6 p-4 rounded-xl glass-panel border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-900 border border-blue-500/20 text-blue-400 shrink-0">
                <Linkedin size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-200">LinkedIn Profile</h4>
                <p className="text-xs text-slate-400">Professional technology leadership and career background</p>
              </div>
            </div>

            <a
              href={siteData.contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/20 transition-colors whitespace-nowrap"
            >
              <span>View Profile</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
