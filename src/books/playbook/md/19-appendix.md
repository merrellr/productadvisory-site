# Appendix: Templates

These templates are starting points. Copy them, adapt them to your product and your organization, and keep them short. A template that nobody fills in is worse than none.

## A. Problem statement

> **[Who]** need to **[goal or job]**, but **[obstacle]**, which leads to **[consequence, ideally measurable]**. Today they **[current workaround]**, which falls short because **[gap]**.

**Check it:**

- [ ] It names a specific person, not "users."
- [ ] It contains no solution.
- [ ] The consequence is something the customer cares about, in their terms.
- [ ] Evidence could prove it wrong.

See Chapter 2.

## B. One-page product strategy

**Vision.** One sentence describing the world you want to create for customers.

**Diagnosis.** What is really going on in the market, and the hardest problem you face. Three to five sentences.

**Where we play.** The customers, problems and channels you will focus on.

**How we win.** The advantage that will make those customers choose you, and why competitors with the same AI tools cannot copy it in a quarter.

**Guiding policy.** Your overall approach, in one or two sentences.

**Key actions.** Three to five coherent actions for the next year.

**Outcomes.** The North Star and the input metrics you will use to know it is working.

**Not doing.** What you will stop or decline, with a sentence on why.

See Chapter 4.

## C. Product brief

**Title and owner.** The name of the work and the product trio accountable for it.

**Problem.** What problem, for whom, with what evidence. Link the problem statement.

**Outcome measure.** The measure you expect to move, today's baseline, and the target.

**Who it is for.** Users, buyers and beneficiaries.

**What we know.** Evidence from discovery.

**What we assume.** The riskiest assumptions, and how and when you will test them.

**Scope.** What is in the first slice.

**Out of scope.** What is explicitly not included, and why.

**Must include.** Non-negotiable requirements: privacy, security, audit, accessibility, performance.

**Open questions.** What the team will answer as it builds.

**Decision log.** Dated decisions, with the reasoning.

See Chapter 9.

## D. One-page roadmap

| Now (committed) | Next (likely) | Later (exploring) |
|---|---|---|
| Problem or outcome, with its measure | Problem, with its measure | Problem only |
| ... | ... | ... |
| Dated commitments, marked clearly | | |

**Capacity allocation this quarter:** new outcomes __%, reliability and performance __%, security and compliance __%, technical debt __%, discovery and experiments __%.

See Chapter 5.

## E. Business case

1. **Problem and customers:** from discovery, with evidence.
2. **Revenue effect:** new customers, expansion, churn prevented, price supported. Show a low, likely and high case, with assumptions.
3. **Cost to build:** product, design and engineering time; third-party costs.
4. **Cost to run:** hosting, support, maintenance, AI model costs, partner fees, per customer and in total.
5. **Effect on unit economics:** gross margin, payback period, retention.
6. **Risks:** what has to be true, and what could go wrong.
7. **How we will know:** the measure, the threshold and the date you will check.

See Chapter 6.

## F. Pilot agreement

- **Problem and measure:** the outcome being tested and how it will be measured.
- **Baseline:** the measure today.
- **Success threshold:** the result that justifies a purchase.
- **Scope and duration:** teams, sites, users and dates. Usually 60 to 90 days.
- **Responsibilities:** what each side provides, including data, people and time.
- **Price:** the pilot fee.
- **Decision-maker and date:** who decides, and when.
- **Expansion terms:** the price, scope and timeline that apply if the threshold is met.

See Chapters 3 and 13.

## G. Launch readiness checklist

**Product**

- [ ] Acceptance criteria met; known issues documented.
- [ ] Outcome measures instrumented and baseline recorded.
- [ ] Feature flags and rollout plan in place.

**Quality, security and trust**

- [ ] Testing complete, including accessibility.
- [ ] Security review and, where relevant, privacy impact assessment done.
- [ ] For AI features: evaluation results meet thresholds; monitoring in place.

**Customers**

- [ ] Release notes and help content ready.
- [ ] Training materials ready; customer approvals obtained where required.

**Go-to-market**

- [ ] Launch tier agreed.
- [ ] Messaging by audience approved, with claims supported by evidence.
- [ ] Sales and customer success enabled: story, demo, objections, boundaries, practice.

**Support and operations**

- [ ] Support team trained; escalation paths clear.
- [ ] Rollback plan tested.

**After launch**

- [ ] Launch review scheduled, with the measures to check at 30, 60 and 90 days.

See Chapters 9 and 13.

## H. Customer health score

| Signal | Example measures | Weight |
|---|---|---|
| Outcomes | Customer's own outcome measure, trended | Highest |
| Adoption | Active users by site; usage trend | High |
| Relationship | Executive sponsor engaged; champion in place | Medium |
| Support | Open issues; ticket trend | Medium |
| Commercial | Payment timeliness; contract questions | Low |

Every at-risk account has an owner and a written plan. See Chapter 14.

## I. AI feature evaluation plan

- **Feature and purpose:** what the AI does, for whom.
- **Autonomy level:** assist, suggest, act with approval, act within limits, or act autonomously, and why.
- **Cost of an error:** what happens if the output is wrong and nobody notices.
- **Evaluation set:** source, size, and how hard and unusual cases are included; how sensitive data is removed.
- **Quality criteria:** specific, agreed by experts.
- **Scoring method:** expert review, automated checks, AI-assisted grading calibrated against people.
- **Launch thresholds:** what quality is required to launch; what blocks a release.
- **Fairness checks:** groups compared, and acceptable differences.
- **Production monitoring:** acceptance and edit rates, error reports, sampled review, cost and latency.
- **Owner:** the person accountable for quality.

See Chapter 17.

## J. AI agent job description

- **Name and purpose:** what the agent does, in one sentence.
- **Owner:** the person accountable for it.
- **Inputs:** the data and sources it may use.
- **Outputs:** what it produces, and for whom.
- **Permissions:** the systems and actions it may access, and nothing more.
- **Human checkpoints:** which outputs or actions require review or approval.
- **Quality measures:** how its work is checked, and how often.
- **Escalation:** what it does when it is unsure, and how people raise concerns about it.
- **Review date:** when its job description and permissions will next be reviewed.

See Chapters 8 and 17.

## K. Glossary

**Acceptance criteria.** The specific, testable conditions a user story must meet to be considered done.

**Annual recurring revenue (ARR).** The yearly value of active subscriptions, excluding one-time fees.

**Autonomy level.** How much an AI feature or agent does without a person's involvement: assist, suggest, act with approval, act within limits or act autonomously.

**Business associate agreement (BAA).** Under HIPAA, the contract required when a vendor handles protected health information on behalf of a healthcare provider or health plan.

**Buying group.** Everyone involved in a business purchase decision: users, champions, economic buyers, technical gatekeepers and influencers.

**Cohort.** A group of customers or users who started in the same period, tracked together over time.

**Configuration.** A setting that changes how the product behaves for a customer without new code.

**Customer acquisition cost (CAC).** Sales and marketing spending in a period, divided by the number of new customers won.

**Discovery.** The continuous work of learning what to build: understanding problems and testing solutions before and during delivery.

**Error budget.** The amount of unreliability a service is allowed under its service level objective. When it runs low, effort shifts to reliability.

**Evaluation set.** A collection of realistic examples, with agreed quality criteria, used to measure an AI feature's output before release and after every change.

**Feature flag.** A switch that turns a capability on or off for specific customers or users without a new release.

**Grounding.** Giving an AI model the specific, relevant information it should use to answer, such as a customer's records, rather than relying on its general knowledge.

**Gross margin.** Revenue minus the cost of delivering the service, as a percentage of revenue.

**Gross revenue retention.** The share of last year's recurring revenue kept from existing customers, ignoring upsells.

**Input metric.** A measure a team can move directly, which drives the North Star.

**Jobs to be done.** The progress a customer is trying to make in a particular circumstance, which they "hire" a product to help with.

**Lifetime value (LTV).** The gross profit a customer is expected to generate over the whole relationship.

**Minimum viable product (MVP).** The smallest thing that delivers real value to real users and tests the core assumption.

**Net revenue retention (NRR).** The share of last year's recurring revenue kept from existing customers, including expansion. Above 100 percent means existing customers are growing.

**North Star metric.** The single measure that best captures the value a product delivers to customers and leads long-term business results.

**Outcome.** A measurable change in customer behavior or results, as distinct from output, the features a team ships.

**Payback period.** How long it takes for a customer's gross profit to repay the cost of acquiring them.

**Positioning.** How you want the market to understand what your product is, who it is for and why it is better than the alternatives.

**Pricing metric.** The unit a customer pays for, such as a seat, a transaction or a patient covered.

**Product trio.** The product manager, product designer and engineering lead who share responsibility for discovery and the outcome.

**Prompt injection.** An attack in which instructions hidden in content an AI system reads attempt to change its behavior.

**Psychological safety.** A shared belief that team members can take risks, ask questions and admit mistakes without fear of punishment or humiliation.

**Retrieval-augmented generation.** A common grounding method: finding relevant information and supplying it to a model with each request.

**Service level objective (SLO).** An explicit target for a service's reliability or speed.

**Smoke test.** An experiment that presents a product or feature as available, to measure whether people try to use it before it is built.

**Time to first value.** How long it takes a new customer to see the outcome they bought the product for.

**Unit economics.** The revenue and costs associated with a single customer, used to judge whether growth makes the business better or worse.

**Vanity metric.** A number that looks good and goes up, but does not help you decide anything.

**WCAG.** The Web Content Accessibility Guidelines, the international standard for accessible digital products; Level AA is the common target.

**Wizard of Oz test.** An experiment in which people deliver a product's outcome by hand behind something that looks like real software.

## L. Further reading

These are the books and studies cited in this playbook that repay reading in full, grouped by the part of the job they help with.

**The product leader's job**

- Marty Cagan, *Inspired: How to Create Tech Products Customers Love* (2nd ed., 2017). The clearest description of how strong product teams work, and the source of the four big risks.
- Teresa Torres, *Continuous Discovery Habits* (2021). A practical, weekly method for discovery, including the opportunity solution tree and the product trio.

**Finding and validating problems**

- Rob Fitzpatrick, *The Mom Test* (2013). A short, funny and indispensable guide to customer interviews that produce the truth.
- Clayton Christensen and colleagues, *Competing Against Luck* (2016). The jobs-to-be-done idea, explained by its best-known advocate.

**Strategy, positioning and roadmaps**

- Richard Rumelt, *Good Strategy Bad Strategy* (2011). Diagnosis, guiding policy and coherent action, and why most "strategies" are nothing of the kind.
- A.G. Lafley and Roger Martin, *Playing to Win* (2013). Where to play and how to win, from a company that practiced it.
- April Dunford, *Obviously Awesome* (2019). The most practical method for positioning a product.
- Joshua Seiden, *Outcomes Over Output* (2019). A short book that changes how teams plan.

**The numbers**

- Michael Marn and Robert Rosiello, "Managing Price, Gaining Profit," *Harvard Business Review* (1992). The classic case for taking pricing seriously.
- Mehrdad Baghai, Stephen Coley and David White, *The Alchemy of Growth* (1999). The three horizons of growth.

**Teams and delivery**

- Amy Edmondson, *The Fearless Organization* (2018). Psychological safety, from the researcher who defined it.
- Nicole Forsgren, Jez Humble and Gene Kim, *Accelerate* (2018). The evidence that delivery speed and stability go together.
- Donald Reinertsen, *The Principles of Product Development Flow* (2009). Cost of delay, batch size and queues, for readers who want the underlying economics.

**Customers and design**

- Christine Sinsky and colleagues, "Allocation of Physician Time in Ambulatory Practice," *Annals of Internal Medicine* (2016). A sobering picture of the work many healthcare products are meant to support.
- Ann Cavoukian, *Privacy by Design: The 7 Foundational Principles* (2009). Short, clear and still the foundation of privacy-respecting products.

**AI**

- National Institute of Standards and Technology, *AI Risk Management Framework* (2023). A structured, practical way to govern AI risk.
- McKinsey & Company, *The State of AI* (published yearly). A useful annual snapshot of how organizations are adopting AI and agents.
