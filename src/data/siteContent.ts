import { Code2, HeartHandshake, Home, Camera, Lightbulb, Users, Rss, ArrowRight } from "lucide-react";

export const siteData = {
  hero: {
    title: "Building practical technology, visual stories, and community tools for people who do good work.",
    subtitle: "I’m Jim Lucke — a retired technology leader now focused on nonprofit impact, practical software, photography, car culture, and ideas that make life easier for real people.",
  },
  missionDashboard: [
    { id: "tech", label: "Technology", icon: Code2, color: "text-cyan-400" },
    { id: "community", label: "Community", icon: Users, color: "text-amber-400" },
    { id: "photography", label: "Photography", icon: Camera, color: "text-purple-400" },
    { id: "soar", label: "SOAR", icon: HeartHandshake, color: "text-teal-400" },
    { id: "cckc", label: "CCKC", icon: Rss, color: "text-red-400" },
    { id: "software", label: "Software Ideas", icon: Lightbulb, color: "text-yellow-400" },
    { id: "home", label: "Home Automation", icon: Home, color: "text-blue-400" },
    { id: "story", label: "Storytelling", icon: ArrowRight, color: "text-green-400" },
  ],
  currentFocus: [
    { title: "Supporting SOAR’s Life Center vision" },
    { title: "Improving CCKC Event Hub" },
    { title: "Writing practical technology field notes" },
    { title: "Capturing community and automotive stories" },
    { title: "Exploring smarter homes for safety and independence" }
  ],
  projects: [
    {
      title: "CCKC Software",
      category: "Practical Software",
      description: "Event check-in, roster support, club workflow tools, and simple digital systems for Corvette Club KC.",
      tags: ["React", "Events", "Club Tools", "Workflow"],
      status: "Active",
      cta: "View Project",
      link: "#"
    },
    {
      title: "SOAR Life Center Support",
      category: "Nonprofit Systems",
      description: "Helping communicate the Life Center vision through storytelling, systems thinking, campaign support, and practical technology.",
      tags: ["SOAR", "Nonprofit", "Fundraising", "Storytelling"],
      status: "Active",
      cta: "View Project",
      link: "#"
    },
    {
      title: "Smart Home & Practical Automation",
      category: "Home Technology",
      description: "Exploring sensors, lighting, routines, and smarter home setups that make daily life safer, easier, and more independent.",
      tags: ["Automation", "Safety", "Elder Support", "Practical Tech"],
      status: "Field Notes",
      cta: "Read More",
      link: "#"
    },
    {
      title: "Photography & Creative Media",
      category: "Visual Storytelling",
      description: "Event photography, abandoned America, graffiti, Corvette culture, and nonprofit storytelling through a lens.",
      tags: ["Photography", "Media", "Events", "Storytelling"],
      status: "Creative",
      cta: "View Gallery",
      link: "#photography"
    },
    {
      title: "Software Ideas & Experiments",
      category: "Innovation Lab",
      description: "App concepts, prototypes, AI-assisted tools, and community-first software ideas built around real-world needs.",
      tags: ["AI", "Apps", "Prototypes", "Community"],
      status: "Exploring",
      cta: "Explore Ideas",
      link: "#"
    }
  ],
  photography: [
    { title: "Abandoned America", image: "/images/photography/abandon-house.jpeg" },
    { title: "Graffiti & Walls That Talk", image: "/images/photography/blm-matters.jpeg" },
    { title: "Corvette Culture", image: "/images/photography/1969c3.jpeg" },
    { title: "Community Moments", image: "/images/photography/community-moment.jpeg" },
    { title: "Travel Through a Lens", image: "/images/photography/newzeland.jpeg" },
    { title: "Light, Texture & Detail", image: "/images/photography/texture-light.jpg" }
  ],
  fieldNotes: [
    { title: "Why practical technology matters more than flashy technology", category: "Practical Tech" },
    { title: "What nonprofits really need from systems and data", category: "Nonprofit Systems" },
    { title: "Building better club workflows one small tool at a time", category: "Community Projects" }
  ],
  about: {
    copy: "My career started in technology leadership, working with organizations to improve systems, solve problems, and make complex work easier. Retirement did not end that curiosity — it redirected it. Today, I spend my time building practical tools, supporting nonprofits, capturing stories through photography, and helping community organizations work smarter."
  },
  contact: {
    email: "jim@jimlucke.com"
  }
};
