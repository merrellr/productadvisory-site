# Shared content used on more than one page.
SERVICES = [
    # id, icon, title, for-when, body, bullets, new
    ("strategy", "strategy", "Product Strategy Development",
     "For when your roadmap doesn't connect to business goals.",
     "We help you build a clear, evidence-based product strategy, one that connects market opportunity to a roadmap your whole organization can rally around. From identifying where the real opportunities lie to defining product positioning that resonates with your buyers, we make sure every roadmap decision traces back to a validated need. The result: a strategy that's both visionary and grounded in what your market actually wants.",
     ["Crafting visionary product roadmaps", "Identifying market opportunities", "Defining product positioning and competitive differentiation"], False),
    ("lifecycle", "lifecycle", "Product Lifecycle Management",
     "For when strategy and execution operate in silos.",
     "From initial concept through sunset, we bring structure and discipline to how your products move through their lifecycle. We help you manage your portfolio with intention: prioritizing the right initiatives, streamlining development handoffs, and making sure every launch is set up for success. The goal is a repeatable, scalable process your team can run long after we're gone.",
     ["Streamlining product development processes", "Enhancing product portfolio management", "Ensuring successful product launches and continuous improvement"], False),
    ("ai", "ai", "AI Enablement",
     "For when AI adoption is scattered across a few individuals instead of built into how your team actually works.",
     "Most organizations already have someone experimenting with AI tools, but that knowledge stays with one person and disappears the moment they change roles. We help turn individual AI curiosity into durable organizational capability: identifying the right first use case, running a real pilot, and building the governance and habits that make AI adoption stick company-wide, not just in one corner of the org.",
     ["Choosing the right first use case", "Running a real pilot with your team", "Governance and habits that make adoption stick"], True),
    ("research", "research", "Market Research and Analysis",
     "For when decisions are based on guesses, not evidence.",
     "Great products start with great insight. We conduct in-depth market and user research (competitive analysis, customer interviews, data synthesis) and turn it into clear, actionable recommendations. Instead of guessing what your users want, you'll know, and you'll be able to prioritize your roadmap with confidence.",
     ["Conducting in-depth market and user research", "Analyzing industry trends and competitive landscapes", "Providing actionable insights for data-driven decisions"], False),
    ("agile", "agile", "Agile Transformation",
     "For when speed doesn't translate into building the right things.",
     "We help teams adopt agile methodologies that actually fit how they work, not a one-size-fits-all framework bolted on from outside. Through hands-on training and facilitation, we build the habits and rituals that make agile stick, from sprint planning to retrospectives. The result is a team that ships more predictably, adapts faster, and communicates better across the organization.",
     ["Implementing agile methodologies and best practices", "Training teams on agile frameworks", "Facilitating agile project management"], False),
    ("coaching", "coaching", "Product Team Coaching and Development",
     "For teams with the will, but not yet the process.",
     "Strong products come from strong product teams. We work directly with your product managers and leaders to build the skills, confidence, and shared practices of a high-performing team through coaching, mentorship, and structured development. Whether you're growing a first product hire into a lead or aligning a whole team around a shared way of working, we help you build product leadership that lasts.",
     ["Building high-performing product teams", "Providing leadership coaching and mentorship", "Enhancing collaboration and communication within teams"], False),
    ("assessments", "assess", "Custom Assessments & Interactive Learning",
     "For when you don't actually know where your team's skill gaps are, or your training doesn't target them.",
     "Generic training solves generic problems. We design custom skill assessments and interactive learning experiences built around your product team's actual competencies, benchmarked against where they genuinely need to be, not a one-size-fits-all course library. See it in action: our own AI + Product Management assessment and learning platform is live in Beta right now at assessment.productadvisory.co, a real, working example of exactly what we build for clients.",
     ["Skill assessments built around your team's competencies", "Learning paths matched to each person's level", "Benchmarks you can re-run to see progress"], True),
]

PACKAGES = [
    ("pkg-cpo", "cpo", "Fractional CPO+", "Get senior product leadership without the overhead of a full-time executive. We embed at the leadership level to set product vision, build your roadmap process, and mentor your existing team, giving you the strategic horsepower of a Chief Product Officer scaled to what your stage and budget actually need.", True),
    ("pkg-training", "training", "Training & Education", "Hands-on workshops and structured curricula that build real product management capability inside your team, not just theory. From foundational PM skills to advanced roadmap and prioritization techniques, we tailor the training to where your team actually is today.", False),
    ("pkg-validation", "research", "Market Validation", "Before you invest in building, know that you're building the right thing. We run structured validation through customer interviews, competitive positioning, and demand signals, so you move forward with evidence instead of assumptions and avoid the cost of building something the market doesn't want.", False),
    ("pkg-gtm", "gtm", "Go to Market", "A great product still needs a great launch. We help you build the go-to-market plan that connects your product to the right buyers, covering positioning, messaging, channel strategy, and launch sequencing, so your release lands with impact instead of silence.", False),
    ("pkg-security", "security", "Security & Compliance", "We help you build security and compliance into your product from the start, not bolt it on after a customer or auditor asks. Whether it's data privacy requirements, industry-specific regulations, or general security best practices, we help you meet the bar your enterprise buyers expect.", False),
    ("pkg-legal", "legal", "Contracting & Legal", "Product decisions carry legal weight, from vendor contracts to data agreements to IP considerations. We help you navigate the contracting and legal review process as it relates to your product, flagging risk early so it doesn't become a blocker later.", False),
    ("pkg-sales", "sales", "Sales & Marketing", "Your product story needs to reach the people who'll actually buy it. We help align your sales and marketing approach with your product's real value proposition, so your go-to-market message matches what you've built and what your buyers actually need to hear.", False),
    ("pkg-ux", "ux", "UX/UI Design", "Good design isn't decoration. It's how users actually experience the value you've built. We provide UX/UI design support that keeps usability and business goals in balance, from wireframes and flows to polished interface design.", False),
]

LEVELS = [
    ("starter", "Starter", "New to product or new to this kind of decision. You'll get plain language and clear steps."),
    ("practitioner", "Practitioner", "You make product decisions regularly and want a more consistent process."),
    ("leader", "Leader", "You guide a team or a portfolio and need to align people and defend choices."),
    ("executive", "Executive", "You set direction and funding and need a clear view of tradeoffs and risk."),
]

DOMAINS = [
    ("Customer & Market Discovery", 72), ("Product Strategy & Roadmapping", 58), ("Prioritization & Trade-offs", 64),
    ("Execution & Delivery", 81), ("Stakeholder Communication & Influence", 90), ("AI Fluency — Individual", 55), ("AI Fluency — Organizational", 38),
]
