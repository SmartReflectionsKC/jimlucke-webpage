import { handleSectionNavigation } from "../utils/navigation";

export function Footer() {
  const footerLinks = [
    { name: "Projects", href: "#projects" },
    { name: "Workshop", href: "#workshop" },
    { name: "Photography", href: "#photography" },
    { name: "Field Notes", href: "#field-notes" },
    { name: "About", href: "#about" },
    { name: "Connect", href: "#connect" },
  ];

  return (
    <footer className="border-t border-white/10 bg-slate-950 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          <div>
            <span className="font-display text-xl font-semibold text-white">Jim Lucke</span>
            <p className="text-slate-400 mt-2 text-sm">
              Technology • Community • Photography • Innovation
            </p>
          </div>

          <div className="flex flex-wrap gap-6 md:justify-end text-sm font-medium text-slate-400">
            {footerLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleSectionNavigation(e, link.href)}
                className="hover:text-amber-400 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Jim Lucke. All rights reserved.</p>
          <p>“Retired from corporate technology. Not retired from building things.”</p>
        </div>
      </div>
    </footer>
  );
}
