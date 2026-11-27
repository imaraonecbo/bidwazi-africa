# Global Digital Work & Innovation Company
## Product and operating blueprint — pivot direction

### 1. Company purpose

Build a technology company that creates real online work and opens it to young people in Kenya, Africa and, progressively, the rest of the world. The company uses software and AI to source, create, organise, quality-check and deliver digital work. People should be able to participate remotely, develop practical skills, build a verifiable work record and earn from completed work.

This is a work-producing and work-delivering company, not a government-tender discovery service, a generic freelance directory, or a pay-to-access job board.

### 2. The operating model

The company has two connected engines:

**Work and revenue engine**
- Win paid contracts from businesses, research organisations, startups, nonprofits and other legitimate customers.
- Build the company's own revenue-generating software, digital products and technology projects.
- Turn approved, funded work into well-scoped assignments with a defined output, quality standard, rate, deadline and available capacity.
- Coordinate contributors and teams, review deliverables, complete client acceptance and collect revenue.
- Allocate and pay contributor earnings under clear terms.

**Global contributor network**
- Free worker registration and profiles.
- Skills, languages, location/time zone, availability, portfolio and completed-work history.
- A live opportunity board showing work that is genuinely open and funded.
- Clear task instructions, rates, expected effort, deadlines, quality criteria and payment status before a person claims work.
- Individual work and team-based project opportunities.
- Submission workspace, feedback, revision history, quality review and transparent earnings ledger.
- A route to progress from small tasks to specialist work, project teams and longer-term engagements.

The product should make available work easy to find and claim. Do not impose an artificial waiting list or approval queue on an open task when its requirements can be checked automatically. Some sensitive, specialised or higher-value projects may still require a skills assessment or human selection.

### 3. Initial paid work categories

Start with work the company can realistically source, scope and quality-control:
- AI data operations: data labelling, annotation, categorisation, transcription review, model-output evaluation and language quality review.
- Software quality work: website and app testing, reproducible bug reports, accessibility checks and structured test execution.
- Data and research operations: data cleaning, spreadsheet verification, web research, structured information extraction and fact checking.
- Digital production: website updates, content operations, localisation, documentation and design/creative production.
- Project teams: supervised delivery teams for website builds, automation, support operations and other contracted technology work.

These are target work categories, not a claim that paid tasks already exist. Publish an opportunity only after the company has secured its budget, customer commitment or approved internal project funding.

### 4. Ideas and innovation studio

Allow contributors to submit useful product ideas, technical concepts and community problems they want to solve. The company can review proposals, invite contributors to develop a prototype, form a team or sponsor a pilot.

Before anyone starts work on an idea, agree in writing whether the arrangement is paid development, a prize/challenge, a licence, revenue share, equity or a different arrangement. Do not imply that submitting an idea automatically earns money or transfers ownership to the company.

### 5. How the company earns and funds contributor pay

The main revenue sources should be:
1. Client contracts for digital delivery, AI data operations, testing, research and managed technology work.
2. Recurring business retainers for ongoing quality assurance, data operations, support and digital production.
3. Revenue from software and digital products owned by the company.
4. Properly contracted innovation projects, licensing and approved revenue-sharing products.

For every contract, calculate the delivery budget before publishing contributor work: contributor compensation, review and project management, infrastructure, payment costs, taxes and company margin. Keep enough cash available to meet contributor payment commitments even where a client payment is delayed, or make the payment milestone explicit in the work terms.

No worker should pay a registration fee, subscription or deposit to access paid work. Do not describe a contributor as an employee unless the legal employment relationship is actually established. Use transparent engagement terms and check local labour, tax, data protection and payment requirements as the network expands across countries.

### 6. AI and automation

AI should help the company operate more efficiently, not fabricate jobs or replace accountability. Appropriate uses include:
- Breaking an approved project into task units and drafting task instructions.
- Matching contributors to open work using skills, language, availability and past quality.
- Providing task guidance, coding/research assistance and translation where permitted by the client.
- Checking submissions for formatting, completeness, duplication and likely quality issues.
- Routing exceptions to human reviewers and explaining why work needs revision.
- Tracking project progress, deadlines, budgets, deliverables and payment eligibility.
- Supporting customer acquisition, proposals and internal operations.

Human review remains necessary for disputed submissions, sensitive data, consequential decisions and final client acceptance. AI-generated evaluations should be explainable, appealable and monitored for bias.

### 7. First product release (MVP)

**Contributor experience**
- Landing page explaining the company and its real work model.
- Free account creation, email verification and secure sign-in.
- Contributor profile, skills, languages, availability and portfolio.
- Open opportunities board with filters for category, skill, rate, deadline and location eligibility.
- Opportunity detail page with full scope, pay, expected effort, requirements and terms.
- Claim or apply flow based on the opportunity's stated selection rules.
- Workroom for instructions, file exchange, submissions and revisions.
- Work history, feedback, earnings ledger and payout status.

**Company operations**
- Admin dashboard to create and manage customers, projects, budgets, opportunity slots and contributor teams.
- Funding/budget gate: an opportunity cannot be published as paid until its budget and payment terms are approved.
- Assignment, review, revision, acceptance and dispute workflow.
- Audit trail for decisions, task changes and payment calculations.
- Payout queue with reconciliation and clear statuses. Initially, payments may require an authorised human operator; do not claim automatic payouts until a provider integration has been tested end to end.
- Basic reporting on revenue, committed worker pay, quality, delivery time and outstanding liabilities.

**Customer/work sourcing**
- A business enquiry and project-scoping path for organisations that need technology, AI data operations, testing or digital services.
- Internal pipeline for identifying, pricing and winning paid work.
- Clear separation between customer contracts, company revenue, project budgets and worker earnings.

### 8. Suggested core data domains

Introduce new work-platform entities additively; do not delete the existing Supabase tables, accounts, storage objects or configuration:
- contributor_profiles and contributor_skills
- customers and client_projects
- project_budgets and funding_approvals
- opportunities and opportunity_slots
- work_assignments and team_memberships
- work_submissions and review_events
- earnings_ledger and payout_batches
- idea_submissions and innovation_projects
- audit_events and operational_notifications

Use Supabase Auth for identity, row-level security for ownership and role boundaries, private Storage for submitted files, Cloudflare Pages for the web application, and Cloudflare Workers for server-side integrations and automation. Keep privileged secrets server-side. Keep existing credentials and working integrations unless an audit proves a specific change is necessary.

### 9. Trust, quality and worker protection

- No fabricated jobs, fake earnings balances, guaranteed-income claims or misleading availability counts.
- No charging people to register or unlock access to work.
- Show pay, eligibility, workload, deadline and acceptance criteria before work is accepted.
- Keep client data and worker identity documents private and collect only what is necessary.
- Use least-privilege access, row-level security, secure file policies, backups and audit logs.
- Provide a correction/dispute route for rejected work and payout issues.
- Separate training opportunities from paid assignments; label unpaid learning clearly and never disguise production work as training.
- Establish country-aware engagement, tax, privacy and payout processes before opening work in a new jurisdiction.

### 10. Delivery sequence

1. **Pivot and preservation:** freeze the tender-specific product direction; retain its database, auth users, credentials and deployment configuration as recoverable legacy resources.
2. **Architecture and security:** inspect the current code, database policies, Workers and environment variables; map reusable authentication, profiles, storage and notification components.
3. **Contributor foundation:** implement contributor profiles, skills, portfolios and secure access.
4. **Work engine:** implement projects, funded opportunities, claiming/assignment, workrooms, submissions and review.
5. **Earnings operations:** implement a truthful earnings ledger, payout approvals and reconciliation before adding a payment provider.
6. **AI operations:** add AI-supported task creation, matching and quality assistance with human oversight and a tested Cloudflare Worker integration.
7. **Customer acquisition and delivery:** build the business enquiry pipeline and operational process that secures paid work before publishing tasks.
8. **Pilot and scale:** run a small, genuinely funded pilot with a limited contributor group; measure completion, quality, margins and payment reliability before expanding globally.

### 11. Preservation and deployment rules

- This blueprint is a pivot plan on a separate Git branch. It does not change the current production deployment.
- Do not merge or deploy a replacement homepage until the new contributor experience is tested in preview.
- Preserve current Supabase project, Auth users, database records, Storage bucket, Cloudflare Pages project, Workers and existing credentials.
- Keep the tender-specific implementation recoverable until its reusable parts have been separated and the new platform has passed verification.
- Do not put secrets, service-role keys, private API tokens or payment credentials in browser code or Git history.
- Do not activate subscriptions or payment collection as a substitute for validating real customer demand and the funded-work pipeline.

### 12. Definition of a successful first pilot

A pilot is successful only when the company has secured a real customer or approved internal project budget, published clearly scoped paid opportunities, onboarded contributors without charging them, received and quality-checked real deliverables, completed customer acceptance, reconciled the budget and paid contributors according to the agreed terms. A deployed website or a populated task board alone is not proof of a functioning business.
