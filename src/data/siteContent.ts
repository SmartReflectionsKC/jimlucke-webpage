import { Code2, HeartHandshake, Home, Camera, Lightbulb, Users, Rss, ArrowRight, Printer, Cpu, Layers } from "lucide-react";

export interface InitiativeItem {
  id: string;
  title: string;
  tagline: string;
  category: string;
  status: string;
  shortSentence?: string;
  description: string;
  highlights: string[];
  actions: {
    label: string;
    type: 'note' | 'anchor' | 'discuss' | 'external';
    target?: string;
    subject?: string;
  }[];
}

export interface WorkshopItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  icon: typeof Code2;
  status: string;
  details: string[];
}

export interface ProjectItem {
  title: string;
  category: string;
  description: string;
  tags: string[];
  status: string;
  cta: string;
  link: string;
  details?: string[];
  story?: string;
}

export const siteData = {
  hero: {
    headline: "Retired from corporate technology. Not retired from building things.",
    subheadline: "I use decades of technology leadership experience to create practical software, support nonprofit organizations, strengthen communities, explore photography, and continue making useful things.",
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
  workingOnNow: [
    {
      id: "collector-hq",
      title: "CollectorHQ",
      tagline: "Every collection. One headquarters.",
      category: "Personal Software",
      status: "In Development",
      shortSentence: "A focused cataloging platform designed to help collectors organize their collections, document provenance, and retain control of their collection records.",
      description: "A focused cataloging platform designed to help collectors organize their collections, document provenance, and retain control of their collection records.",
      highlights: [
        "Structured Cataloging: Custom attributes tailored to specialized collections, from automotive memorabilia to rare historical items.",
        "Provenance & Documentation: Structured records, photo attachments, condition reports, and export formats.",
        "Data Control: Designed to give collectors direct ownership and control over their private catalog archives."
      ],
      actions: [
        { label: "Discuss CollectorHQ", type: "discuss", subject: "CollectorHQ Conversation" },
        { label: "Explore Workshop Ideas", type: "anchor", target: "#workshop" }
      ]
    },
    {
      id: "empower-response",
      title: "EmpowerResponse",
      tagline: "Practical technology supporting care, independence, and emergency response.",
      category: "Public Safety & Special Needs",
      status: "Active Innovation",
      shortSentence: "Helping authorized first responders access important communication, sensory, and support information when responding to an individual with special needs.",
      description: "Helping authorized first responders access important communication, sensory, and support information when responding to an individual with special needs.",
      highlights: [
        "Immediate Context: Quickly presents preferred communication methods, sensory de-escalation tips, and trusted emergency contacts.",
        "Privacy & Safeguards: Restricted access protocols designed to safeguard personal details while aiding responders in urgent moments.",
        "Dignified Support: Equips first responders with actionable guidance to interact with empathy and understanding."
      ],
      actions: [
        { label: "Read Field Note", type: "note", target: "empowerresponse-first-responders" },
        { label: "Discuss Initiative", type: "discuss", subject: "EmpowerResponse Feedback & Collaboration" }
      ]
    },
    {
      id: "cckc-event-hub",
      title: "CCKC Event Hub",
      tagline: "Streamlined event registration, check-in, attendance, and reporting for Corvette Club KC.",
      category: "Community Software",
      status: "Live & Active",
      shortSentence: "A mobile check-in platform replacing paper clipboards with fast, volunteer-friendly digital workflows at club gatherings.",
      description: "A tailored mobile check-in and event administration web platform that replaced clipboard bottlenecks and paper waivers with rapid volunteer-friendly digital workflows.",
      highlights: [
        "Frictionless Volunteer Check-in: Runs on any smartphone or tablet at cruise staging areas without app store downloads.",
        "Attendance & Roster Sync: Instant real-time attendance counts and roster verification for organizers.",
        "Club Coordination: Streamlines coordination across charity drives, cruises, and monthly gatherings."
      ],
      actions: [
        { label: "View Project Details", type: "anchor", target: "#projects" },
        { label: "Discuss Club Tech", type: "discuss", subject: "Corvette Club Software" }
      ]
    },
    {
      id: "soar-life-center",
      title: "SOAR Life Center",
      tagline: "Supporting the development of a transformative community center for individuals with disabilities and their families.",
      category: "Nonprofit Vision",
      status: "Capital Campaign",
      shortSentence: "Supporting the planning, communication, and technology behind SOAR Special Needs’ proposed Life & Community Center.",
      description: "Supporting the planning, communication, and technology behind SOAR Special Needs’ proposed Life & Community Center.",
      highlights: [
        "Vision for Belonging: Supporting plans for day programs, respite care, social clubs, and vocational opportunities.",
        "Strategy & Systems: Assisting leadership with donor engagement technology, operational systems, and campaign communications.",
        "Community Foundation: Helping establish the operational backbone required to launch Phase One of the proposed center."
      ],
      actions: [
        { label: "Read Campaign Story", type: "note", target: "soar-life-center-phase-one" },
        { label: "Discuss SOAR Vision", type: "discuss", subject: "Supporting SOAR Life Center" }
      ]
    }
  ] as InitiativeItem[],
  projects: [
    {
      title: "CCKC Software & Event Hub",
      category: "Practical Software",
      description: "Designed and implemented a dedicated mobile registration and check-in system for the Corvette Club of Kansas City to modernize staging operations.",
      tags: ["React", "Events", "Club Tools", "Workflow"],
      status: "Active",
      cta: "View Project Details",
      link: "#",
      details: [
        "The Problem: Club cruises and charity rallies relied on physical clipboards and paper waiver sheets, creating registration queues and delayed event departures.",
        "What Was Built: A responsive, lightweight web application allowing volunteer marshals to look up members, verify registrations, and log attendees from any phone browser without app store hurdles.",
        "Who It Serves: Volunteer cruise coordinators, board officers, and hundreds of club members staging at charity drives and regional runs.",
        "Practical Outcome: Replaced manual paper tracking with real-time roster synchronization, cutting check-in times to under 30 seconds per vehicle and eliminating lost paperwork."
      ],
      story: "By focusing on the specific friction volunteers faced in parking lots on chilly Saturday mornings, simple web technology eliminated lines and let organizers focus on hospitality and safety."
    },
    {
      title: "SOAR Life Center Systems Support",
      category: "Nonprofit Systems",
      description: "Provided operational roadmaps, storytelling frameworks, and donor communication systems for SOAR Special Needs' capital campaign.",
      tags: ["SOAR", "Nonprofit", "Fundraising", "Storytelling"],
      status: "Active",
      cta: "View Project Details",
      link: "#",
      details: [
        "The Problem: As demand for special needs day programs and respite services outgrew temporary facilities, SOAR needed clear operational and storytelling frameworks to articulate its long-term vision to supporters.",
        "What Was Contributed: Systems roadmaps, campaign presentation materials, donor tracking workflows, and technology requirements for Phase One of the proposed center.",
        "Who It Serves: The leadership team at SOAR Special Needs, community stakeholders, and the hundreds of families seeking permanent day and respite programming.",
        "Practical Outcome: Created structured, professional campaign deliverables and operational models that help donors understand both immediate milestones and multi-year impact."
      ],
      story: "Turning a visionary community project into a tangible plan requires translating big dreams into structured steps, milestones, and sustainable operational models."
    },
    {
      title: "Multimedia Club Newsletters",
      category: "Visual Storytelling",
      description: "Created dynamic digital publications combining high-resolution photojournalism, event narratives, and sponsor visibility for automotive enthusiast clubs.",
      tags: ["Publishing", "Media", "Photography", "Community"],
      status: "Active",
      cta: "View Details",
      link: "#",
      details: [
        "The Problem: Traditional club newsletters were delivered as static, low-resolution PDFs with print-era layouts that failed to engage members on mobile devices.",
        "What Was Built: A modern digital publishing template featuring rich photo galleries, embedded event recaps, hyperlinked sponsor directories, and accessible typographic layouts.",
        "Who It Serves: Club members, event organizers, and local business sponsors whose community partnerships support charitable club donations.",
        "Practical Outcome: Elevated member engagement, increased sponsor visibility, and established an enduring photographic archive of club heritage."
      ],
      story: "Every gathering of car enthusiasts has stories worth documenting. Infusing modern layouts and thoughtful imagery transforms routine newsletters into keepsakes."
    },
    {
      title: "CollectorHQ Platform Architecture",
      category: "Product Architecture",
      description: "Architected the data models, provenance tracking structure, and privacy-preserving storage design for private historical collections.",
      tags: ["TypeScript", "Collections", "Architecture", "Local-First"],
      status: "Designing",
      cta: "View Architecture",
      link: "#",
      details: [
        "The Problem: Serious collectors often manage valuations, restoration documentation, and purchase histories across fragmented notes, physical receipts, and disconnected spreadsheets.",
        "What Was Contributed: Flexible entity-relationship data schemas, document archival conventions, and backup protocols tailored to collectibles and historical artifacts.",
        "Who It Serves: Collectors, restorers, and family historians who need durable, structured asset documentation without reliance on bloated enterprise databases.",
        "Practical Outcome: Established a resilient foundation where provenance records, appraisals, and condition reports remain organized, portable, and under the owner's direct control."
      ],
      story: "Preserving historical items is as much about documenting their story and provenance as maintaining the physical objects themselves."
    }
  ] as ProjectItem[],
  workshop: [
    {
      id: "software-prototypes",
      title: "Software Concepts & Prototypes",
      category: "Digital Workshop",
      description: "Single-purpose web utilities, AI-assisted development tools, and lightweight civic software designed to eliminate everyday frictions.",
      tags: ["AI Workflows", "TypeScript", "React", "Rapid Prototyping"],
      icon: Code2,
      status: "Active Lab",
      details: [
        "Single-Purpose Tools: Focused utilities proving that helpful software doesn't need to be huge, expensive, or bloated.",
        "AI-Assisted Acceleration: Leveraging modern LLMs to compress ideation, boilerplate, and prototyping phases from weeks to hours.",
        "Real-World Testing: Deploying prototypes with real users quickly to learn what is actually useful."
      ]
    },
    {
      id: "home-automation",
      title: "Private & Resilient Home Automation",
      category: "Local-First Systems",
      description: "Architecting a secure, cloud-independent smart home environment prioritizing privacy, family safety, and tactile wall controls.",
      tags: ["Home Assistant", "Zigbee", "Local-First", "Safety"],
      icon: Home,
      status: "Ongoing Setup",
      details: [
        "Safety-First Routines: Automatic night path illumination, water leak detection shutoffs, and ambient alerts that protect the home.",
        "100% Local Reliability: Prioritizing local-first controllers (Home Assistant) that function completely independent of cloud internet connections.",
        "Human-Centered Dashboards: Clean, high-contrast touchscreens that make control obvious without requiring phone apps."
      ]
    },
    {
      id: "3d-printing",
      title: "3D Printing & Functional Fabrication",
      category: "Maker Lab",
      description: "Custom functional parts, mounting brackets, physical adapters, and tactile problem-solving from CAD design to physical reality.",
      tags: ["3D Printing", "CAD", "Functional Makes", "Prototyping"],
      icon: Printer,
      status: "In the Shop",
      details: [
        "Functional Problem Solving: Designing custom mounting solutions for smart sensors, automotive fixtures, and home workshop organization.",
        "Assistive Hardware Adaptations: Prototyping grip aids, tactile indicators, and modified enclosures to support accessibility.",
        "Rapid Iteration: Taking an idea from digital dimensioning to physical test-fit within hours."
      ]
    },
    {
      id: "practical-experiments",
      title: "Practical Technology Experiments",
      category: "Experimentation",
      description: "Hands-on tinkering with microcontrollers, ambient status monitors, local network telemetry, and sensory feedback systems.",
      tags: ["IoT", "Microcontrollers", "Telemetry", "Hardware"],
      icon: Cpu,
      status: "Bench Testing",
      details: [
        "Ambient Telemetry: Physical desk displays providing glanceable awareness of network status, weather trends, and system health.",
        "Low-Power Sensors: Battery-powered environmental sensors deployed across workshop and outdoor zones.",
        "Hardware-Software Bridges: Exploring how tactile switches and dials can bring physical satisfaction back to digital systems."
      ]
    }
  ] as WorkshopItem[],
  about: {
    copy: "My career was spent in technology leadership, working with teams to design systems, solve complex problems, and deliver software that served real operations. Retirement from the corporate world didn’t end that curiosity — it redirected it. Today, I dedicate my time to hands-on building: creating practical software for nonprofits and community groups, exploring photography and visual storytelling, experimenting in the workshop with home automation and 3D printing, and helping people who do good work."
  },
  contact: {
    email: "jim@jimlucke.com",
    linkedin: "" // Configurable placeholder: Set to verified profile URL (e.g. "https://www.linkedin.com/in/...") when available
  }
};
