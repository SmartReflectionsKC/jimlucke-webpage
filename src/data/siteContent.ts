import { Code2, HeartHandshake, Home, Camera, Lightbulb, Users, Rss, ArrowRight, Printer, Cpu, Layers } from "lucide-react";

export interface InitiativeItem {
  id: string;
  title: string;
  tagline: string;
  category: string;
  status: string;
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
      description: "A centralized, intelligent cataloging and provenance platform designed specifically for collectors who need structured tracking, valuation history, documentation, and asset headquarters without bloated enterprise software.",
      highlights: [
        "Structured Cataloging: Custom attributes tailored to specialized collections, from automotive memorabilia to rare historical items.",
        "Provenance & Media: High-resolution photo attachments, receipt archival, condition reports, and insurance-ready export formats.",
        "Local-First & Secure: Built with privacy in mind so collection records remain confidential, portable, and accessible anytime."
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
      description: "Connecting authorized first responders with essential guidance at critical moments—helping protect individuals with disabilities, sensory sensitivities, communication challenges, and medical conditions during emergencies.",
      highlights: [
        "Rapid Context Access: Surfaces need-to-know communication preferences, calming strategies, and emergency contacts in seconds.",
        "Privacy & Trust by Design: Need-to-know emergency access controls that keep sensitive information safe while aiding responders when seconds count.",
        "Built Around Dignity: Helps first responders de-escalate stressful interactions and treat vulnerable citizens with immediate understanding."
      ],
      actions: [
        { label: "Read Field Note", type: "note", target: "empowerresponse-first-responders" },
        { label: "Discuss Initiative", type: "discuss", subject: "EmpowerResponse Feedback & Collaboration" }
      ]
    },
    {
      id: "cckc-event-hub",
      title: "CCKC Event Hub",
      tagline: "Streamlined event registration, check-in, attendance, and reporting for the Corvette Club of Kansas City.",
      category: "Community Software",
      status: "Live & Active",
      description: "A tailored mobile check-in and event administration web platform that replaced clipboard bottlenecks and paper waivers with rapid volunteer-friendly digital workflows.",
      highlights: [
        "Frictionless Volunteer Check-in: Runs on any smartphone or tablet at cruise staging areas without app store downloads.",
        "Attendance & Roster Sync: Instant real-time attendance counts and roster verification for organizers.",
        "Club Coordination: Streamlines coordination across dozens of charity drives, cruises, and monthly gatherings."
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
      description: "Helping communicate and organize systems for SOAR Special Needs' permanent campus—creating spaces for belonging, respite, vocational training, adult social clubs, and long-term community infrastructure.",
      highlights: [
        "Infrastructure for Belonging: Purpose-built campus providing camp, day programs, respite, life-skills development, and employment pathways.",
        "Systems & Campaign Strategy: Assisting with campaign communication, donor engagement architecture, and technology planning.",
        "Phase One Foundation: Creating the permanent base to serve hundreds of families who have outgrown temporary spaces."
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
      description: "Event check-in, roster support, club workflow tools, and simple digital systems for Corvette Club KC.",
      tags: ["React", "Events", "Club Tools", "Workflow"],
      status: "Active",
      cta: "View Project Details",
      link: "#",
      details: [
        "Digitized Event Check-in: Eliminated clipboard bottlenecks with a responsive, fast web check-in application that volunteers can run on any mobile device.",
        "Roster & Club Sync: Automated membership list updates, giving organizers instant access to event RSVP lists and accurate club records.",
        "Workflow Streamlining: Replaced fragmented manual forms with simple digital registration flows, making pre-event coordination a breeze."
      ],
      story: "Corvette Club KC holds frequent events, charity drives, and member cruises. By digitizing key parts of our administration, we minimized pre-event queues, saved trees, and let coordinators focus on making gatherings memorable."
    },
    {
      title: "SOAR Life Center Systems Support",
      category: "Nonprofit Systems",
      description: "Helping communicate the Life Center vision through storytelling, systems thinking, campaign support, and practical technology.",
      tags: ["SOAR", "Nonprofit", "Fundraising", "Storytelling"],
      status: "Active",
      cta: "View Project Details",
      link: "#",
      details: [
        "The SOAR Life & Community Center is more than a proposed building — it is a vision for daily support, long-term hope, and a true place of belonging for individuals with special needs and their families.",
        "From respite and camp to life skills, social connection, employment pathways, and future care, this project is designed to answer the questions families carry every day.",
        "With the right people, partners, and resources, SOAR can turn this vision into a lasting home for the special needs community.",
        "Read more to see why Phase One matters — and how you may be part of helping it begin."
      ],
      story: "SOAR Special Needs does exceptional work providing care, support, and community for individuals with disabilities. Helping plan the operations and systems for the future SOAR Life Center ensures the organization can scale its life-changing services efficiently."
    },
    {
      title: "Multimedia Club Newsletters",
      category: "Visual Storytelling",
      description: "Interactive digital newsletters for car clubs and community organizations combining stories, photography, sponsor recognition, and event highlights.",
      tags: ["Publishing", "Media", "Photography", "Community"],
      status: "Active",
      cta: "View Details",
      link: "#",
      details: [
        "Digital-First Layouts: Interactive publications that integrate high-resolution event photography, clickable links, video embeds, and QR codes.",
        "Community Showcase: Highlighting member stories, volunteer achievements, and automotive culture to foster belonging and member retention.",
        "Sponsor Value: Giving local sponsors clean, trackable visibility that supports club fundraising and charity initiatives."
      ],
      story: "Club newsletters don't have to be static PDFs designed like 1990s print flyers. By infusing modern storytelling and rich imagery, they become vibrant touchpoints that members look forward to reading every month."
    },
    {
      title: "CollectorHQ Platform Overview",
      category: "Product Architecture",
      description: "A specialized personal collection headquarters combining provenance records, documentation, and asset management.",
      tags: ["TypeScript", "Collections", "Architecture", "Local-First"],
      status: "Designing",
      cta: "View Concept",
      link: "#",
      details: [
        "Flexible Schema: Designed to accommodate anything from vintage automobiles and parts to historical artifacts and art.",
        "Document Vault: Secure storage for titles, restoration receipts, appraisals, and historical certificates.",
        "Zero Cloud Dependency Option: Architecture prioritizes personal data ownership and offline resilience."
      ],
      story: "Serious collectors currently juggle spreadsheets, loose paper receipts, and Dropbox folders. CollectorHQ provides one clean headquarters for everything that matters about what you've preserved."
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
        "AI-Assisted Build Workflows: Exploring modern LLM techniques that allow solo experienced builders to build and test robust tools in hours.",
        "Civic Tech Starter Kits: Simple, transparent templates for clubs and grassroots nonprofits transitioning off paper."
      ]
    },
    {
      id: "home-automation",
      title: "Smart Home & Practical Automation",
      category: "Automation Lab",
      description: "Local-first home sensors, ambient notifications, automated safety routines, and fall-prevention lighting for comfort and independent living.",
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
    email: "jim@jimlucke.com"
  }
};
