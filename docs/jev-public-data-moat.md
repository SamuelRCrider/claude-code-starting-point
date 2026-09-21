# Jev + a public data moat: prevailing-wage labor classification

Research date: 2026-09-21. Written for Sam. Everything below was gathered from public sources listed at the end; nothing here was live-tested against the Jev API or the government APIs because this sandbox blocks both.

## The answer in one paragraph

Build a **certified-payroll pre-audit engine for prevailing-wage work** (Davis-Bacon, state prevailing wage, and the Inflation Reduction Act's prevailing-wage-and-apprenticeship rules). Every worker-week on a public-works or clean-energy project must be mapped to one classification on a government wage determination and paid that rate plus fringe. Today that mapping and review is done by hand: contractor payroll clerks, prime-contractor compliance staff, agency labor compliance officers, and a layer of third-party "labor compliance" consulting firms, which is the BPO. The data needed to automate it is fully public and machine-readable, and I found no AI-native player doing the classification step. Jev is an unusually good fit because the core decision is "pick one item from a closed list, with a calibrated confidence", which is exactly Jev's `Choice` primitive, and the rest is arithmetic your code owns.

## Part 1. What Jev is and how to build with it

Source of truth: the official SDK packages on npm and PyPI (I unpacked `@typesafe-ai/sdk` 0.6.0 and `typesafe-sdk` 0.7.1, whose wire models are generated from `https://api.typesafe.ai/openapi.json`), plus the community reference `awesome-jev-by-typesafe` (snapshot 2026-09-19). `docs.typesafe.ai` itself is blocked from this sandbox, so page-level claims below cite the community snapshot.

### The mental model

Jev is TypeSafe AI's "System One" model. It does not generate text. You send a **state** (a string, JSON object, or array of text) and a map of **typed questions**; it returns one typed answer per question in a single non-autoregressive pass, with probabilities. TypeSafe trains it with "Reinforcement Learning for Calibrated Decisions" so that the confidence numbers are meaningful in aggregate: higher confidence, higher accuracy. Vendor-reported latency is 70 to 500 ms end to end.

The design rule that every serious guide repeats: **questions describe judgments; code owns composition, thresholds, arithmetic, and side effects.**

### The API contract

| Item | Value |
|---|---|
| Endpoint | `POST https://api.typesafe.ai/v1/systemone` (also `GET /v1/models`) |
| Auth | `Authorization` header, key from `TYPESAFE_API_KEY`, console at `console.typesafe.ai` |
| Default model | `jev-latest` (aliases move; community snapshot lists `jev-1.13.0`; pin a version when thresholds matter) |
| Request body | `{ "state": ..., "model": "...", "questions": { name: Question } }` |
| Context | 64k tokens per request; 32k for state plus the longest question |
| Rate limits (listed) | 250,000 tokens/second, 1,200 requests/minute, subject to change |
| Price (listed) | $0.042 per million input tokens; output tokens free |
| Modality | Text only. English primary. |
| Data use | TypeSafe states requests are not used for training |

### The three primitives

```jsonc
// Noul: probability a statement is true
{ "type": "noul", "instructions": "Does `duties` describe operating a crane?",
  "criteria": { "true": "...", "false": "..." } }            // criteria optional
// -> { "type": "noul", "noul": 0.93 }

// Choice: one label from a closed set
{ "type": "choice", "instructions": "Which classification fits?",
  "criteria": { "ELEC0001-001 Electrician": "...", "LABO0002-003 Laborer": "...", "other": null } }
// -> { "type": "choice", "choice": "...", "confidence": 0.88, "probabilities": {...} }

// Score: position on an ordered rubric, index 0..n-1
{ "type": "score", "instructions": "How complete is the statement of compliance?",
  "criteria": ["Missing", "Present but unsigned", "Signed and complete"] }
// -> { "type": "score", "score": 1.7, "confidence": 0.8, "legend": {...}, "probabilities": {...} }
```

Every question in one request is evaluated independently against the same state, so you batch many questions per call ("fan-out"). A `Noul` near 0.5 means "uncertain", not "medium".

### SDKs

Python (`pip install typesafe-sdk`, pydantic-based, sync and async clients):

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

with TypeSafeClient() as client:          # reads TYPESAFE_API_KEY
    r = client.system_one(
        state={"document": "I was charged twice."},
        questions={"category": Choice(instructions="What is this about?",
                                      criteria={"billing": None, "technical": None, "other": None})},
    )
r.choices["category"].choice          # "billing"
r.choices["category"].confidence      # 0.9
r.choices["category"].probabilities   # {"billing": 0.9, ...}
r.usage.input_tokens
```

TypeScript (`npm install @typesafe-ai/sdk`, Node 20+):

```ts
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
const client = new TypeSafeClient();
const res = await client.systemOne({ state, questions: { category: choice("...", { billing: null, other: null }) } });
res.answers.category.choice;
```

Other access paths: Vercel AI SDK provider `@ai-sdk/typesafe-ai` (model `typesafe-ai/jev`), Cloudflare Workers AI (`typesafe/jev`), OpenRouter, LiteLLM pass-through, Pydantic AI, and BAML. Community helpers worth copying: `pi-typesafe` (bounded-concurrency `evaluateMany`, `chunkEvaluationRequest`, and a `calibrate()` kit that sweeps thresholds and reports AUC, precision, and recall), and the Python `jev` package (`@jev.fn` compiles a pydantic return model into questions).

### Patterns that matter for this product

1. **Confidence-gated routing.** Act on the answer only above a threshold you set from labeled data; route the rest to a human. Raise the threshold as the cost of a wrong action rises.
2. **Two-stage hierarchical choice.** Pick the branch first (trade group), then ask a second question only over that branch's items. Keeps the option set small and contrastive.
3. **Pre-parsed extraction.** Have code find candidate spans (rates, hours, dates), then ask Jev which one is the right value. Never ask Jev to do arithmetic or date math.
4. **Speculative fan-out.** Ask every question you might need in one call and ignore the irrelevant answers in code.
5. **Pin the model version and log it** on every stored decision, because calibrated thresholds are model-specific.
6. **Always include `other` / `none_of_the_above`** in a `Choice` when the list might be incomplete. In this domain that answer is itself a valuable signal (it means a conformance request may be needed).

### Known limits

64k context, so you send the relevant slice of a wage determination, not the whole PDF. Text only, so scanned timecards need OCR first. English-primary. No open-ended output, so the explanation for a reviewer must come from a template or a separate LLM call.

## Part 2. How I screened for a moat

Criteria, in priority order: (1) the data is public and reachable by API or bulk file, not scraped from 3,000 portals; (2) a real BPO layer exists whose job is to look at that data and make a repeatable decision; (3) AI-native competitors are absent or thin; (4) the decision is closed-set with a calibrated-confidence escalation path, which is what Jev does better and cheaper than an LLM; (5) the problem recurs weekly or per transaction.

| Candidate | Public data | BPO layer | AI penetration | Jev fit | Verdict |
|---|---|---|---|---|---|
| **Prevailing-wage classification and certified-payroll review** | SAM.gov wage determinations API (~90k determinations, ~85k Davis-Bacon), state determinations, CA DIR public certified-payroll search, DOL WHD enforcement data (~370k cases) | Labor compliance consultants, LCPtracker managed services, agency labor compliance officers, prime-contractor compliance staff | None found doing classification; incumbents are reporting portals | Excellent: `Choice` over a WD's classification list with confidence; arithmetic in code | **Build this** |
| H-1B / PERM SOC code and wage level | OFLC wage library, O*NET, DOL LCA disclosure files, DOL wage-level worksheet | Immigration paralegals, offshore knowledge centers at large firms | Lookup tools exist; AI filing startups (OpenSphere) focus on O-1/EB-1 | Excellent: worksheet is a rubric of yes/no steps | Runner-up; policy risk is high right now |
| HTS tariff classification with CBP CROSS rulings | CROSS: 221,851 rulings, public; USITC HTS API | Customs-broker classification desks, $30 to $150 per SKU manual | Crowded: GingerControl, SupplyGraph, Gaia Dynamics, TariffLens, Thomson Reuters | Good | Bigger market, but not "unleveraged" |
| Sanctions screening alert adjudication | trade.gov Consolidated Screening List API, OFAC SDN | Genpact, EXL, WNS analyst pools; $15 to $25 per alert; 95 to 99% false positives | Every vendor claims AI; Genpact runs GenAI here | Excellent | Data is commodity, no moat |
| Provider credentialing / exclusion monitoring | NPPES, OIG LEIE, PECOS, state boards | CVOs, $14 to $17B market | Medallion, Verifiable, symplr all AI-native | Good | Crowded |
| Background-check court research | 3,000+ county courts, fragmented | Court runners, offshore adjudication | Checkr uses ML | Good | Data is not API-shaped |
| Business license compliance | 75,000 jurisdictions, ordinances not API-shaped | CSC, CT, Avalara managed services | Human research | Medium | Data acquisition is the whole company |
| Trademark watching | USPTO bulk, ~15M global filings/year | Clarivate, Corsearch analysts; ~$2.2B market | Clarivate ships "AI-enhanced" watch | Good | Incumbents already there |
| Pharmacovigilance case intake | openFDA, DailyMed labels | $7 to $9B outsourcing market | 60 to 70% of routine intake already automated at large sponsors | Good | Late |

## Part 3. The recommendation in depth

### The problem people have all the time

Any contractor on a federally funded construction job over $2,000 must submit a weekly certified payroll (form WH-347) showing each worker's classification, hours, rate, and fringe, matched to the project's wage determination. Most states have a parallel regime for state-funded work. Since 2023 the Inflation Reduction Act ties the 5x "bonus" value of nine clean-energy tax credits to the same prevailing-wage and apprenticeship rules, with an 80% credit haircut for uncorrected failures, so every utility-scale solar, wind, storage, and hydrogen project now needs this compliance whether or not it takes public money. DOL's own list of recurring violations starts with craft misclassification, then hours that don't match timecards, miscalculated fringes, and apprentice-ratio problems. Wage and Hour recovered roughly $259M in back wages in FY2025 and raised the per-violation civil penalty to $13,508.

### The BPO layer you would displace or sell to

- Third-party labor compliance firms that review and upload certified payrolls for primes and agencies: Labor Compliance Specialists, Public Works Compliance Advisors, Labor Compliance Pros, Public Works Consultant LLC, Prevailing Wage Consulting LLC, Contractor Compliance and Monitoring Inc., and dozens of regional peers.
- LCPtracker, eMars, Elation, eComply, B2Gnow: agency-mandated submission portals that flag arithmetic errors but do not judge classification. LCPtracker also sells managed review services.
- Public-agency labor compliance officers (Caltrans, LAUSD, transit agencies, housing authorities) who review subcontractor payrolls by hand.
- IRA-side: tax advisors and developers' compliance consultants (Reunion, Big Four PWA practices) who now need contractor-level payroll evidence at closing.

### The public data moat

| Source | What it gives you | Access |
|---|---|---|
| SAM.gov Wage Determinations | Every Davis-Bacon general decision by state, county, and construction type, with classification text, base rate, fringe, and union code; every revision retained | REST at `sam.gov/api/prod/wdol/v1/...`; no bulk file, but the API returns all ~90k records by state, county, and type |
| State prevailing-wage determinations | California DIR, New York DOL, Washington L&I, Illinois DOL, and others publish per-craft rates and scope-of-work language | Web and PDF; CA has structured pages |
| **California DIR eCPR Public Search** | Actual certified payroll records for every public-works project in the state, with SSNs stripped: contractor, project, craft classification, hours, rate, fringe | Public search on dir.ca.gov. This is the labeled corpus nobody has used: real classification decisions at scale to calibrate Jev thresholds and to find misclassification patterns |
| DOL WHD enforcement data (WHISARD) | Every concluded compliance action since FY2005: employer, act violated (DBRA, CWHSSA), back wages, penalties | Bulk download and API via DOL Open Data Portal; ~370k rows |
| DOL conformance guidance and SF-1444 process | Rules for when a classification is missing and how to propose one | Public |
| Apprenticeship.gov and state DAS registries | Registered programs and ratios for apprentice-rate eligibility | Public |
| USAspending / FPDS / SAM opportunities | Which contracts carry federal funds, so Davis-Bacon coverage can be inferred | Public API |

Why this is a moat and not just data: the value is in the joined, cleaned corpus (WD classification text + scope-of-work language + real payroll decisions + enforcement outcomes) and in the calibration set you build on top of it. Everyone can download the pieces. Nobody has assembled them into a decision engine.

### Where Jev makes each decision

Keep every number in code. Ask Jev only the semantic questions.

1. **Construction type** for a project description: `Choice` over Building, Residential, Highway, Heavy using DOL's AAM 130/131 definitions as criteria. Picks which wage determination applies.
2. **Worker classification**: two-stage `Choice`. Stage one picks the trade group from the WD; stage two picks the exact classification within that group, with each option's criteria being the WD text plus state scope-of-work language. State is the worker's trade, listed duties, equipment, timecard notes, and the employer's own label. Include `other`.
3. **Duty-consistency checks**: a fan-out of `Noul`s per worker-week, such as "Do the duties describe work that requires a journeyman electrician license?" or "Does this note describe operating power equipment?", which catch the classic downgrade of an operator to a laborer.
4. **Apprentice eligibility**: `Noul` on whether the described worker matches a registered program's occupation, then ratio math in code.
5. **Deductions and notes**: `Noul`s for "Is this deduction described as voluntary and authorized in writing?" and similar WH-347 statement-of-compliance items.
6. **Everything else is code**: rate versus WD rate, fringe versus WD fringe, hours versus timecards, overtime, week-over-week consistency, apprentice ratios, WD revision in force on the payroll date.

Routing: confidence above your calibrated threshold auto-clears; middle band goes to a reviewer with the top two alternatives shown; `other` or low confidence flags "possible conformance request needed". Calibrate the thresholds on the California corpus and on your own reviewers' decisions, and re-run the calibration whenever you move the pinned model version.

### Unit economics

A payroll of 40 workers with roughly six questions each is about 240 questions over maybe 8k tokens of state, or well under a cent per payroll at the listed price. A consultant charges per payroll or per project and a compliance officer spends minutes per payroll. Even at 90% auto-clear with humans on the rest, the cost floor is two orders of magnitude below today's.

### Risks and what I could not verify

- SAM.gov's wage-determination endpoint is documented by third parties and used by scrapers, but I could not hit it from this sandbox. Confirm auth and rate limits first.
- California's eCPR public search may need scraping rather than bulk export; SB 954 adds a database for trust funds, not necessarily for the public. Verify terms of use before building on it.
- Classification is legally the contractor's responsibility. Position the product as pre-audit and evidence, not as a certification.
- Wage determinations are text with local conventions; the per-option criteria will need cleanup per state. That cleanup is part of the moat.

### Runner-up: H-1B and PERM wage-level determination

Same shape, different agency. The SOC code and one of four wage levels drive every Labor Condition Application, and DOL's 2009 guidance defines wage level as a points worksheet (start at Level I; add points for education above O*NET norms, experience above the Job Zone, supervisory duties, and special skills). That worksheet is a list of `Noul` questions with the sum in code, and SOC selection is a hierarchical `Choice`. Public data: OFLC wage library, O*NET web services, and DOL's quarterly LCA and PERM disclosure files, which are a labeled history of hundreds of thousands of filings. The BPO layer is immigration paralegals and the large firms' offshore knowledge centers. I put it second only because the policy environment (the $100k H-1B fee, the proposed wage-minimum rule, wage-weighted lottery) makes volume unpredictable this year.

## Part 4. Starter code

`examples/prevailing_wage/` contains a runnable Python harness that fetches a wage determination from SAM.gov, builds the two-stage classification questions, calls Jev, and applies the routing thresholds. It runs in `--dry-run` mode without a key and prints the exact request bodies it would send.

## Sources

Jev and TypeSafe: npm `@typesafe-ai/sdk` 0.6.0 and PyPI `typesafe-sdk` 0.7.1 package contents; https://github.com/Anil-matcha/awesome-jev-by-typesafe; https://typesafe.ai/blog/introducing-system-one-models-and-jev; https://docs.typesafe.ai/api; https://www.tomshardware.com/tech-industry/artificial-intelligence/typesafe-ais-jev-offers-an-alternative-to-llms-that-claims-to-be-193x-faster-and-445x-cheaper-system-one-type-model-is-bespoke-for-probabilistic-decision-making; https://vercel.com/kb/guide/typesafe-jev-and-ai-sdk; https://developers.cloudflare.com/ai/models/typesafe/jev/; https://pydantic.dev/docs/ai/models/typesafe/; https://boundaryml.com/blog/typesafe-ai-jev

Prevailing wage: https://sam.gov/wage-determinations; https://govconapi.com/sam-gov-wage-determination-api; https://www.dol.gov/agencies/whd/fact-sheets/66-dbra; https://www.dol.gov/agencies/whd/government-contracts/construction/faq/conformance; https://www.dir.ca.gov/public-works/certified-payroll-reporting.html; https://www.unioncounsel.net/private-sector-news/california-to-create-online-database-of-electronic-certified-payroll-records-for-public-works-construction-accessible-to-joint-labor-management-trust-funds-and-committees-sb-954; https://catalog.data.gov/dataset/wage-and-hour-division-compliance-action-data; https://www.irs.gov/credits-deductions/prevailing-wage-and-apprenticeship-requirements; https://www.congress.gov/crs-product/R48428; https://www.ebacon.com/compliance/certified-payroll-mistakes-that-lead-to-violations/; https://laborcompliancespecialists.com/; https://publicworkscomplianceadvisors.com/; https://lcptracker.com/

H-1B: https://www.dol.gov/sites/dolgov/files/eta/oflc/pdfs/npwhc_guidance_revised_11_2009.pdf; https://www.congress.gov/crs-product/IF12892; https://www.dol.gov/agencies/eta/foreign-labor/wages

Screened alternatives: https://rulings.cbp.gov/; https://gingercontrol.com/blog/hts-code-lookup-api-vs-manual; https://www.genpact.com/case-studies/a-leap-in-sanctions-screening-accuracy-and-efficiency; https://www.retailbankerinternational.com/comment/why-99-percent-sanctions-screening-alerts-false-positives/; https://www.researchandmarkets.com/reports/6076361/credentials-verification-organization-cvo; https://www.mordorintelligence.com/industry-reports/background-screening-market; https://www.cscglobal.com/service/business-administration/business-license-solutions/business-license-guide/; https://www.wiseguyreports.com/reports/trademark-monitoring-service-market; https://store.frost.com/global-pharmacovigilance-and-safety-testing-outsourcing-services-market-forecast-to-2030.html
