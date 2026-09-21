import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { handleSectionNavigation } from "../utils/navigation";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "#" },
    { name: "Projects", href: "#projects" },
    { name: "Workshop", href: "#workshop" },
    { name: "Photography", href: "#photography" },
    { name: "Field Notes", href: "#field-notes" },
    { name: "About", href: "#about" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a
          href="#"
          onClick={(e) => handleSectionNavigation(e, '#')}
          className="font-display text-xl font-semibold tracking-tight text-white hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg px-1 py-0.5"
          aria-label="Jim Lucke Home"
        >
          Jim Lucke
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleSectionNavigation(e, link.href)}
              className="text-sm text-slate-300 hover:text-white transition-colors focus:outline-none focus:text-amber-400"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#connect"
            onClick={(e) => handleSectionNavigation(e, '#connect')}
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Connect
          </a>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden p-2 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
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
            className="lg:hidden absolute top-20 left-0 w-full bg-slate-900 border-b border-white/10 py-5 px-6 flex flex-col gap-4 shadow-2xl"
            aria-label="Mobile Navigation"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) =>
                  handleSectionNavigation(e, link.href, {
                    onNavigate: () => setIsOpen(false),
                  })
                }
                className="text-base text-slate-300 hover:text-amber-400 transition-colors py-1"
              >
                {link.name}
              </a>
            ))}
            <a
              href="#connect"
              onClick={(e) =>
                handleSectionNavigation(e, '#connect', {
                  onNavigate: () => setIsOpen(false),
                })
              }
              className="inline-block mt-2 px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold text-center hover:bg-amber-400 transition-colors"
            >
              Connect
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
