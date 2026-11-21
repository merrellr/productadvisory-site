# Part 3: Building

# 8. Building and Leading the Product Team

**The big idea.** How a team works together matters more than who is on it. Build psychological safety, clarity and stable, mission-driven teams, with the product trio at the core.

**Key points**

- The **product trio** (product, design, engineering) owns discovery and the outcome together.
- Bring **specialists** such as clinical, security and compliance experts in at discovery, not at launch.
- Google's research found five dynamics of effective teams, with **psychological safety** the foundation.
- Build safety by **going first on mistakes,** asking what you're missing, thanking dissent and closing the loop.
- Give teams **missions, not feature lists;** organize around customer journeys; **write down decision rights;** keep teams stable.
- Hire for **curiosity, clear writing, judgment, influence and ownership.** Test the real work.
- Every AI agent a team runs in production needs a **named owner.**

![The five dynamics of effective teams. Source: Google re:Work.](../fig/8-2.png){width=100%}

**Checklist**

- [ ] Does each team have an outcome mission?
- [ ] Does each trio do discovery together?
- [ ] Are decision rights written down?
- [ ] Do you run blameless reviews?
- [ ] Do your product managers get regular coaching?

**Try this week.** Ask your team to rate the five dynamics anonymously, one to five. Discuss the lowest score and agree one change to try for a month.

# 9. From Requirements to Release, with Engineering and Design

**The big idea.** Requirements are a conversation, not a contract. Start with a short brief, slice thin, release often, and put quality gates throughout the flow.

**Key points**

- A **one-page brief:** problem, measure, who it's for, what's known and assumed, scope, **out of scope,** must-haves and open questions.
- **User stories** need concrete acceptance criteria, including **privacy, audit and accessibility.**
- Involve **design from the first conversation** and design for the real environment.
- Bring **engineers in early** to shape solutions, and treat estimates as forecasts.
- **Slice thin, release often,** and use **feature flags** to separate deployment from release.
- Speed and stability **go together** (Accelerate). Never use delivery metrics to rank people.
- Review every launch against **the measure it was meant to move.**

![From idea to release.](../fig/9-2.png){width=100%}

**Checklist**

- [ ] Does significant work start with a one-page brief?
- [ ] Do acceptance criteria include privacy, audit and accessibility?
- [ ] Does "done" include testing, security and measurement?
- [ ] Do launches have a readiness review and rollback plan?
- [ ] Are AI-generated requirements and code reviewed by accountable people?

**Try this week.** Write the brief for your next big piece of work with the whole trio in under an hour. Pay attention to "out of scope."

# 10. Data, Analytics and Evidence-Based Decisions

**The big idea.** Be data-informed, not data-driven. Agree on a North Star and the inputs that drive it, watch retention honestly, and pair numbers with stories.

**Key points**

- A **North Star** captures value delivered and leads revenue. **Input metrics** are what teams can move.
- Remove **vanity metrics.** If a number changing wouldn't change a decision, drop it.
- **Retention by cohort** is the most honest measure: look for curves that flatten.
- Correlation is not causation. Use **experiments or careful comparisons** before claiming impact.
- **Decide measures before** looking at results.
- Build foundations: an event taxonomy, **one definition per metric,** and no personal data in unapproved tools.
- Join usage, support and contract data to find **leading indicators** of renewal.

![A metrics tree: North Star, inputs and outcomes (illustrative).](../fig/10-1.png){width=100%}

**Checklist**

- [ ] Do you have a North Star and owned input metrics?
- [ ] Have vanity metrics left the main dashboard?
- [ ] Do you track retention by cohort?
- [ ] Is each key metric defined once, for people and AI tools alike?
- [ ] Do you pair numbers with customer conversations?

**Try this week.** Draw your metrics tree, remove every dashboard chart that isn't on it, and call two customers about the input that moved most last month.

# 11. Trust by Design: Security, Privacy and Compliance

**The big idea.** Trust is a product feature and the fourth pillar of leadership. Build security, privacy, compliance and accessibility in from discovery, not in a review at the end.

**Key points**

- Breaches are costly, and costliest in healthcare: **$7.42 million on average** in 2025, against $4.44 million across industries (IBM).
- Know the rules that apply: in US healthcare, **HIPAA and business associate agreements,** interoperability rules, FDA software oversight, state privacy laws and accessibility rules.
- **Security by design:** threat modeling, least privilege, strong identity, encryption, audit logs, secure development, a practiced incident plan.
- **Privacy by design:** collect the minimum, use data only as stated, default to private, plan for deletion.
- **Accessibility** is part of quality: 94.8 percent of top home pages had detectable failures (WebAIM, 2025). Target WCAG AA.
- Make compliance a **partner,** and keep a **trust package** current.
- Map every **AI data flow,** guard against prompt injection, and evaluate AI for accuracy and fairness.

![Trust by design, stage by stage.](../fig/11-2.png){width=100%}

**Checklist**

- [ ] Do significant features get a threat model and privacy review?
- [ ] Is WCAG AA part of your definition of done?
- [ ] Is there a practiced incident response plan?
- [ ] Do you maintain a trust package?
- [ ] Is every AI data flow covered by the right agreements?

**Try this week.** Walk your most sensitive workflow with engineering, design and compliance: what data, who can see it, is it logged, and can a keyboard-only user complete it?
