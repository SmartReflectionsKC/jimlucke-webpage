import { siteData } from "../data/siteContent";
import { Mail, MessageSquare, Heart, Camera } from "lucide-react";
import { motion } from "motion/react";

export function Connect() {
  const options = [
    { icon: Mail, title: "Direct Email", desc: "General inquiries and hello.", color: "text-amber-400" },
    { icon: MessageSquare, title: "Project Conversation", desc: "Software ideas and collaboration.", color: "text-cyan-400" },
    { icon: Heart, title: "Nonprofit & Community", desc: "SOAR, CCKC, and community work.", color: "text-teal-400" },
    { icon: Camera, title: "Photography & Media", desc: "Event coverage and creative projects.", color: "text-purple-400" },
  ];

  return (
    <section id="connect" className="py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-display font-semibold text-white mb-4">Let's Connect</h2>
        <div className="w-12 h-1 bg-amber-500 rounded-full mx-auto mb-8"></div>
        
        <p className="text-slate-400 mb-12 max-w-xl mx-auto">
          Whether you want to talk about a practical software idea, community work, or photography, I'm always open to a good conversation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {options.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 flex gap-4 group hover:border-white/20 transition-colors"
              >
                <div className={`mt-1 ${opt.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">{opt.title}</h3>
                  <p className="text-sm text-slate-400 mb-4">{opt.desc}</p>
                  <a href={`mailto:${siteData.contact.email}`} className={`text-sm font-medium ${opt.color} hover:underline`}>
                    Send Email
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
