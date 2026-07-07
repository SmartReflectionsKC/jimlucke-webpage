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
      link: "#",
      details: [
        "Digitized Event Check-in: Eliminated clipboard bottlenecks with a responsive, fast web check-in application that volunteers can run on any mobile device.",
        "Roster & Club Sync: Automated membership list updates, giving organizers instant access to event RSVP lists and accurate club records.",
        "Workflow Streamlining: Replaced fragmented manual forms with simple digital registration flows, making pre-event coordination a breeze."
      ],
      story: "Corvette Club KC holds frequent events, charity drives, and member cruises. By digitizing key parts of our administration, we minimized pre-event queues, saved trees, and let coordinators focus on making gatherings memorable."
    },
    {
      title: "SOAR Life Center Support",
      category: "Nonprofit Systems",
      description: "Helping communicate the Life Center vision through storytelling, systems thinking, campaign support, and practical technology.",
      tags: ["SOAR", "Nonprofit", "Fundraising", "Storytelling"],
      status: "Active",
      cta: "View Project",
      link: "#",
      details: [
        "Life Center Visioning: Synthesizing system workflows and communication patterns to support the physical and digital blueprint for the future SOAR Life Center.",
        "Visual Advocacy: Crafting digital materials and stories that clearly articulate the 'why' behind the Life Center's fundraising campaigns.",
        "Administrative Optimization: Developing lightweight templates and systems to reduce volunteer scheduling friction and maximize community engagement."
      ],
      story: "SOAR Special Needs does exceptional work providing care, support, and community for individuals with disabilities. Helping plan the operations and systems for the future SOAR Life Center ensures the organization can scale its life-changing services efficiently."
    },
    {
      title: "Smart Home & Practical Automation",
      category: "Home Technology",
      description: "Exploring sensors, lighting, routines, and smarter home setups that make daily life safer, easier, and more independent.",
      tags: ["Automation", "Safety", "Elder Support", "Practical Tech"],
      status: "Field Notes",
      cta: "Read More",
      link: "#",
      details: [
        "Safety-First Routines: Configuring motion sensors, automated leak detection, and low-glare nighttime path lighting for age-in-place environments.",
        "Local-First Stability: Prioritizing secure, offline-capable smart home hubs (like Home Assistant) that keep personal data local and ensure 100% uptime.",
        "Simplified Control: Creating bespoke tablet-friendly interfaces that consolidate multiple appliance standards into one obvious, clean screen."
      ],
      story: "Smart home technology should go far beyond playing music or turning lights purple. The true magic is building ambient, low-maintenance assistance systems that prevent falls, monitor environmental safety, and support absolute independence."
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
      link: "#",
      details: [
        "Single-Purpose Prototypes: Designing highly focused web tools that prove that elegant, helpful software doesn't need to be huge or expensive.",
        "AI-Assisted Development: Exploring how advanced LLM workflows let independent builders research, draft, and deploy finished digital projects in hours.",
        "Open-Source Checklists: Packaging clean starting scripts, database schemas, and documentation to help community clubs get off paper."
      ],
      story: "The most satisfying code is often written in response to a very specific, practical real-world friction. This playground is where I prototype small tools to see what modern AI-driven build stacks can accomplish for civic and hobbyist needs."
    }
  ],
  photography: [
    { title: "Abandoned America", image: "/images/photography/abandon-house.jpeg" },
    { title: "Graffiti & Walls That Talk", image: "/images/photography/blm-matters.jpeg" },
    { title: "Corvette Culture", image: "/images/photography/artist-c3.jpeg" },
    { title: "Community Moments", image: "/images/photography/soarlifecentervision.jpg" },
    { title: "Travel Through a Lens", image: "/images/photography/newzeland.jpeg" },
    { title: "Light, Texture & Detail", image: "/images/photography/snow-light-dark.jpeg" }
  ],
  fieldNotes: [
    {
      title: "Why practical technology matters more than flashy technology",
      category: "Practical Tech",
      date: "July 2, 2026",
      readTime: "4 min read",
      summary: "In a world obsessed with shiny new tools, true innovation is often found in the quiet, simple systems that just work.",
      content: [
        "In my 30+ years of technology leadership, I've watched countless organizations fall into the trap of chasing the newest shiny object. Whether it's a massive, over-engineered enterprise platform or the latest trendy framework, there's always a temptation to choose complexity over utility. But here's what experience has taught me: the best technology is the kind that silently solves a problem and gets out of the way.",
        "When I work on local community projects, support nonprofits, or implement home automation today, I start by asking a simple question: What is the smallest, most reliable solution that can do this job? If a lightweight, custom utility can reliably automate a painful manual task, it is infinitely better than an expensive platform that requires endless training and maintenance.",
        "Practical technology is built with empathy. It doesn't force the user to adapt to the machine; it shapes itself to the human's existing workflow. In our quest for innovation, let's never lose sight of utility. A tool that actually gets used because it's simple, reliable, and obvious is the ultimate form of sophisticated engineering."
      ]
    },
    {
      title: "What nonprofits really need from systems and data",
      category: "Nonprofit Systems",
      date: "June 18, 2026",
      readTime: "5 min read",
      summary: "How simple, integrated workflows and actionable clarity can free up nonprofit staff to focus on their real mission: helping people.",
      content: [
        "Nonprofits are driven by mission, passion, and human connection. Unfortunately, their technology systems are too often slow, fragmented, or overly complicated. When assisting organizations like SOAR Special Needs, I frequently see staff spending precious hours fighting with clunky databases or manually copying data between systems, rather than focusing on their core community programs.",
        "What nonprofits need isn't more data; they need actionable clarity. They need simple, integrated workflows that answer basic questions instantly: Who is registered? Who has checked in? Where are our volunteers needed right now? When we design systems for nonprofits, we have to respect their resource constraints. They don't have dedicated IT departments to maintain delicate custom architectures.",
        "By focusing on secure, cloud-based data consolidation and clean, robust user interfaces, we can unlock hundreds of staff hours. Practical technology in the nonprofit sector is a force multiplier for empathy—it frees up the humans to do what they do best: care for other humans."
      ]
    },
    {
      title: "Building partnerships with First Responders",
      category: "Innovation Lab",
      date: "May 24, 2026",
      readTime: "3 min read",
      summary: "Empower equips first responders with essential information to better support individuals with special needs, improving communication, safety, and outcomes during emergencies and everyday interactions.",
      content: `
There are moments when the right information, delivered at the right time, can change the outcome of an emergency.

For individuals with disabilities, developmental differences, medical conditions, communication challenges, or sensory sensitivities, an emergency situation can become overwhelming very quickly. First responders may arrive with the best intentions, but without the context they need, even a routine interaction can become confusing, stressful, or unsafe.

EmpowerResponse™ is being created to help close that information gap.

The goal is simple: give authorized responders access to the right guidance at the moment it matters most, so they can approach each person with better understanding, greater confidence, and more compassion.

The Problem We Are Trying to Solve

In many emergency situations, responders are forced to make quick decisions with limited information. They may not know whether someone is nonverbal, sensitive to touch, easily overwhelmed by loud commands, medically fragile, prone to elopement, or unable to respond in a typical way.

A person who does not make eye contact may be misunderstood.

A person who does not respond to verbal instructions may be viewed as uncooperative.

A person who becomes overwhelmed by lights, sirens, or physical proximity may unintentionally escalate a situation.

In these moments, families and caregivers often wish responders knew what they know: what calms their loved one, what triggers distress, who to call, what medical concerns matter, and how to communicate in a way that helps instead of harms.

EmpowerResponse™ is being built around that need.

A Better Way to Support Critical Moments

EmpowerResponse™ is intended to provide authorized emergency personnel with secure, need-to-know information that can help guide safer interactions.

That information may include things such as communication preferences, emergency contacts, medical considerations, calming strategies, and other important details that help responders understand the person in front of them.

The technology is designed to work quickly, securely, and practically in real-world situations. The purpose is not to overwhelm responders with unnecessary data. The purpose is to surface the most useful guidance when time matters.

At its core, EmpowerResponse™ is about helping responders move from uncertainty to understanding.

How the Technology Will Work

While the specific design and implementation details are intentionally being protected, the general concept is straightforward.

EmpowerResponse™ will use secure digital tools to connect authorized responders with important support information tied to an individual profile. Access would be controlled, information would be protected, and the experience would be designed around speed, clarity, and appropriate use.

The platform is being imagined with caregivers, families, responders, schools, and community support teams in mind. Each group has a different role, but they all share the same goal: better outcomes when someone vulnerable is in a stressful or emergency situation.

The system is not intended to replace training, judgment, or human compassion. It is intended to support those things with timely, relevant information.

Why Security and Trust Matter

Because EmpowerResponse™ involves sensitive personal information, trust must be built into the foundation.

That means protecting information, limiting access, respecting privacy, and making sure the right people can manage or view the right information at the right time.

Families and caregivers need confidence that the information they provide will be handled responsibly. Responders need confidence that the guidance they see is useful, current, and easy to understand. Communities need confidence that the platform is being built with care, not just convenience.

EmpowerResponse™ is being created with those responsibilities in mind.

The Benefits We Hope to Create

The potential benefits of EmpowerResponse™ are meaningful.

For individuals, it may help reduce fear, confusion, escalation, or unnecessary force during a crisis.

For families and caregivers, it may provide peace of mind knowing that critical information can be available when they are not physically present.

For responders, it may offer practical guidance that helps them communicate better, respond more safely, and make more informed decisions.

For schools, care organizations, and community programs, it may become another tool to support safety planning and continuity of care.

And for the broader community, it represents a step toward a more thoughtful emergency response model — one that recognizes that not every person communicates, processes stress, or responds to authority in the same way.

Built Around Dignity

EmpowerResponse™ is not just a technology project.

It is a dignity project.

It is being created because people deserve to be seen as individuals, especially in moments when they may not be able to explain themselves. It is being created because families should not have to hope that responders will somehow know what they need to know. It is being created because first responders deserve better tools when they are asked to make fast decisions in complex situations.

Most importantly, it is being created because better information can lead to better understanding — and better understanding can lead to safer outcomes.

EmpowerResponse™ is still developing, but the mission is clear:

To help emergency responders, caregivers, schools, and communities support vulnerable individuals with more awareness, more confidence, and more compassion when it matters most.
`
    }
  ],
  about: {
    copy: "My career started in technology leadership, working with organizations to improve systems, solve problems, and make complex work easier. Retirement did not end that curiosity — it redirected it. Today, I spend my time building practical tools, supporting nonprofits, capturing stories through photography, and helping community organizations work smarter."
  },
  contact: {
    email: "jim@jimlucke.com"
  }
};
