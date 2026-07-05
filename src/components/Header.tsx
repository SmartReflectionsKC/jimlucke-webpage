import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Projects", href: "#projects" },
    { name: "Field Notes", href: "#field-notes" },
    { name: "Photography", href: "#photography" },
    { name: "About", href: "#about" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" className="font-display text-xl font-semibold tracking-tight text-white hover:text-amber-400 transition-colors">
          Jim Lucke
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-sm text-slate-300 hover:text-white transition-colors">
              {link.name}
            </a>
          ))}
          <a href="#connect" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10">
            Connect
          </a>
        </nav>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-slate-300" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-20 left-0 w-full bg-slate-900 border-b border-white/10 py-4 px-6 flex flex-col gap-4"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-base text-slate-300 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <a
              href="#connect"
              className="inline-block mt-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium text-center border border-white/10"
              onClick={() => setIsOpen(false)}
            >
              Connect
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
