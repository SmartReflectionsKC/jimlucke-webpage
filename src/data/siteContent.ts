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
    { title: "Building a CCKC Web App" },
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
        "The SOAR Life & Community Center is more than a proposed building — it is a vision for daily support, long-term hope, and a true place of belonging for individuals with special needs and their families.",
        "From respite and camp to life skills, social connection, employment pathways, and future care, this project is designed to answer the questions families carry every day.",
        "With the right people, partners, and resources, SOAR can turn this vision into a lasting home for the special needs community.",
        "Read more to see why Phase One matters — and how you may be part of helping it begin.",
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
    },
    {
      title: "Multimedia Club Newsletters",
      category: "Visual Storytelling",
      description: "I create professional, engaging newsletters for car clubs and community organizations that highlight members, events, sponsors, and achievements—helping increase visibility, strengthen connections, and attract new members.",
      tags: ["AI", "Media", "Prototypes", "Community"],
      status: "Active",
      cta: "Explore Ideas",
      link: "#",
      details: [
       "I create professional, interactive digital newsletters for car clubs, nonprofits, and community organizations.",
       "Each publication combines engaging stories, event coverage, original photography and video, member highlights, sponsor recognition, clickable links, QR codes, and other interactive features that make information easy to explore and share.",
       "More than simply reporting the news, these newsletters help organizations strengthen connections with current members, promote upcoming activities, recognize volunteers and supporters, provide value to sponsors, and showcase the personality of the organization.",
       "The result is a polished digital publication that increases visibility, encourages participation, attracts new members, and keeps the community informed and engaged."
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
      title: "SOAR Life Center - Phase One - Capital Campaign",
      category: "Nonprofit Systems",
      date: "July 8, 2026",
      readTime: "6 min read",
      summary: "Help SOAR turn a bold vision into reality by supporting the Capital Campaign to build a Life & Community Center for individuals with special needs and their families. This future home will create space for belonging, respite, life skills, connection, and long-term hope.",
      content: `# Why the SOAR Life Center Matters

## Building a future where every family belongs

For families in the special needs community, the daily questions are often bigger than most people realize.

Where can my child safely belong?

Who understands the unique needs of our family?

Where can we find respite, friendship, life skills, employment pathways, and long-term support?

What happens when I am no longer able to provide the care my loved one needs?

These are not abstract questions.

They are the questions parents and guardians carry quietly every day.

SOAR Special Needs has spent years coming alongside families by creating places where individuals with special needs are welcomed, celebrated, supported, and seen.

Through camp, respite, social clubs, community events, volunteer support, and family-centered programming, SOAR has become more than a nonprofit.

It has become a trusted community.

Now SOAR is looking toward a larger vision.

The SOAR Life & Community Center is a proposed permanent home designed to serve individuals with special needs and their families across many stages of life.

It is not simply a building project.

It is a vision for daily support, long-term hope, and a true place of belonging.

## What the SOAR Life & Community Center could become

The Life & Community Center is envisioned as a purpose-built campus where families can find support in one place.

The larger vision includes camp programming, respite, after-school support, teen and adult social opportunities, life-skills development, employment readiness, accessible recreation, community training, vocational programs, and future housing through Bubba’s House.

For families, that matters.

It means a parent may one day have a trusted place where their child can attend camp, build friendships, practice independence, participate in social activities, and learn skills that support a more confident future.

It means caregivers may have access to meaningful respite, not just for a few minutes of relief, but for true rest and restoration.

It means individuals with special needs may have more opportunities to work, contribute, create, serve, and be part of the community in ways that match their gifts and abilities.

It means siblings, parents, guardians, and extended family members may find a place that understands the whole family, not just one piece of the journey.

Most importantly, it means families would not have to feel like they are walking this road alone.

## Why Phase One is so important

The full Life & Community Center vision is large, but every major vision begins with a foundation.

Phase One is that foundation.

Phase One focuses on the core pieces needed to move SOAR from borrowed and temporary spaces into a more permanent home for its mission.

This phase would help support a permanent home for SOAR Disability Day Camp, expanded respite programming, after-school support, adult and teen social clubs, employment readiness, vocational opportunities, a coffee shop and bakery concept, community training space, accessible recreation, a community garden, and family-centered gathering spaces.

Phase One is not about building everything at once.

It is about creating the first meaningful step toward a campus that can grow over time.

It is about building the base that allows SOAR to serve more families, reduce uncertainty, and create a stronger platform for future phases.

For families who already know SOAR, this is not hard to understand.

They have seen what happens when their loved one is welcomed by name.

They have felt the relief of knowing someone else understands.

They have watched their child or adult participant make friends, participate, laugh, and be celebrated.

Phase One gives that impact a home.

## How this could impact daily life for families

The Life & Community Center matters because it is designed around real family needs.

A parent may need a safe place for after-school care.

A caregiver may need respite to sleep, work, reconnect with a spouse, spend time with other children, or simply breathe.

A young adult may need a pathway to meaningful work.

A participant may need a place to build friendships beyond school.

A family may need support planning for the future.

A child may need a place where sensory needs, medical needs, behavioral needs, and social needs are understood before the family ever walks in the door.

Many families in the special needs community spend their lives adapting to places that were not built for them.

They explain, prepare, apologize, advocate, and worry.

The SOAR Life & Community Center represents something different.

It represents a place built with these families in mind from the beginning.

That difference is powerful.

## Why the community should care

The special needs community is not a small side issue.

It is part of every city, every school district, every church, every workplace, and every neighborhood.

When families do not have support, the impact reaches far beyond the home.

Parents leave the workforce.

Caregivers burn out.

Siblings carry stress.

Individuals with disabilities become isolated.

Communities miss out on the gifts, personalities, talents, and contributions of people who deserve to be included.

A project like the SOAR Life & Community Center is not charity in the shallow sense of the word.

It is community investment.

It is infrastructure for belonging.

It is a practical response to a real and growing need.

Kansas City has the opportunity to help create something that could become a model for other communities.

That should matter to business leaders, foundations, churches, civic leaders, educators, healthcare professionals, developers, architects, volunteers, and families alike.

## How companies and organizations can help

A project of this size will not happen because one person believes in it.

It will happen because the right people step forward.

Corporate partners can help through major gifts, sponsorships, matching gift programs, employee volunteer teams, in-kind services, and strategic introductions.

Foundations can help by investing in a proven mission with a direct impact on families, caregivers, inclusion, employment, respite, and long-term community support.

Real estate professionals, developers, architects, contractors, attorneys, financial advisors, healthcare leaders, educators, and policy advocates can help by bringing expertise that Phase One will require.

Community leaders can help by opening doors to people and organizations that may not yet know SOAR’s story.

Families and volunteers can help by sharing the mission with their own networks.

Not everyone can write a large check.

That is understood.

But many people know someone who can help.

Many people know a business owner, foundation leader, philanthropist, church leader, civic partner, developer, builder, healthcare professional, or corporate executive who should hear this story.

Those introductions matter.

Sometimes the person who cannot fund the vision is the person who knows the one who can.

## The role of monthly donors

Large gifts and major partnerships will be important to the Life Center campaign.

But monthly donors also matter deeply.

Monthly giving helps provide stability.

It helps SOAR continue serving families today while building toward tomorrow.

A monthly donor does not have to give at a transformational level to make a transformational difference over time.

A steady group of committed monthly supporters shows foundations, major donors, and campaign partners that the community believes in the mission.

It says SOAR is not only a big dream.

It is a mission with people standing behind it.

For those who believe in the work but may not be able to make a major gift, monthly giving is one of the most practical ways to help.

## A call to step forward

The SOAR Life & Community Center is a bold vision.

It should be.

Families in the special needs community deserve bold.

They deserve more than temporary spaces, waiting lists, and programs that disappear when a lease changes or a building is no longer available.

They deserve a place that says, “You belong here.”

They deserve a place where children, teens, adults, parents, guardians, siblings, volunteers, and community partners can come together.

They deserve a place where respite, friendship, employment, life skills, recreation, training, and future planning are not scattered across disconnected systems.

They deserve a home built with them in mind.

SOAR has the mission.

SOAR has the families.

SOAR has the proof of impact.

Now SOAR needs people, partners, resources, introductions, and leadership to help bring Phase One to life.

If you can give, give.

If you can volunteer, volunteer.

If you can open a door, open it.

If you know someone who should hear this story, share it.

If you represent a company, foundation, church, civic group, or professional network that could help, now is the time to connect.

The SOAR Life & Community Center is more than a building.

It is a future home for belonging, support, opportunity, and hope.

Come SOAR with us, and help build it.
`
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
      summary: "Empower equips first responders with essential information to better support individuals with special needs, improving communication, safety, and outcomes during emergencies and everyday interactions. My ask: I need feedback from first responders and parents / caregivers to ensure we develop the right solution.",
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
