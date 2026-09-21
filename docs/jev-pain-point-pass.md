# Where conventional LLMs are failing people, and Jev is the easy fix

Research date: 2026-09-21. Companion to `jev-public-data-moat.md`.

## What this is, and what it is not

You asked for a Reddit pass. From this sandbox every route to Reddit is closed: reddit.com and old.reddit.com, the Redlib and Libreddit mirrors, the Pullpush and Arctic Shift archives, Wayback and archive.ph, the DuckDuckGo and Bing result pages, and the search tool itself, which refuses `reddit.com` under its crawler policy. The Hacker News, Stack Overflow, Hugging Face forum, OpenAI developer forum, n8n, Zapier, Make, Shopify and HubSpot communities are blocked the same way.

So this pass ran across the same complaints in the places the search tool can still summarize: OpenAI developer forum threads, GitHub issues, Hacker News threads as quoted by third parties, the n8n community, dev.to and Medium write-ups of Reddit threads, academic papers that measure the failure modes people complain about, and the launch-week Hacker News debate about Jev itself. Forty-four queries, two sweeps: one for developers, one for non-developer users who reach for ChatGPT to make repetitive yes/no or pick-one decisions.

`examples/reddit_pass/reddit_pain_scan.py` is the real Reddit pass, ready to run from a machine that can reach Reddit. It pulls threads by subreddit and keyword through Reddit's public JSON endpoints and uses Jev itself to triage which posts describe a Jev-shaped problem.

## The fit rule, calibrated by people who tested Jev

Before the list, the boundary. Independent testers and the Hacker News thread agree on where Jev is strong and where it is not, and that boundary decides which of the problems below are "easy":

- Jev is strongest on short inputs with crisp labels. Accuracy and confidence fall together as inputs get longer and labels fuzzier (Aman Kumar's test across Enron spam, SST-2, AG News and Banking77).
- The confidence number is the product. On items where Jev was at or above 0.9 confidence it matched or beat the general LLMs; abstaining on the rest is the whole play (Hacker News thread; the "fish at the poker table" essay; the agent tool-call risk benchmark on dev.to found calibration held).
- Hard limits people hit: 255 options per Choice, 32k tokens of state, text only, English primary. Taxonomies with a thousand leaves need a two-stage Choice.
- TypeSafe's own workflow eval puts Jev at 67.8% versus 73 to 74% for the best generative models, at roughly 1/200th the cost and 1/50th the latency. It is not smarter; it is cheap, fast, typed, and honest about uncertainty.

So "easy to solve with Jev" below means: a closed answer space, a short state you can assemble in code, a real cost from being wrong, and a human or fallback path that a calibrated confidence can route to.

## Tier 1: the same complaint, everywhere, and a one-call fix

### 1. "My structured output breaks about 1% of the time and takes down the pipeline"

Evidence: OpenAI developer forum threads on invalid JSON from Structured Outputs, schema validation that changed without notice in June 2026 and rejected schemas already in production, extra braces in output, and vague "invalid schema" errors. dev.to and GitHub issues on `JSON.parse` failing on local-model output. The n8n community's canonical failure: "you ask for JSON, you get mostly JSON plus a rant."

Why LLMs fail: the answer is a generated string, so the parser is a second point of failure and retries cost money and time.

Jev fix: there is no string. `Choice`, `Score` and `Noul` return typed fields; the SDKs validate them against generated schemas; the reported structured-output error rate is zero. For any field that is a label, an ordered level, or a boolean, the JSON layer disappears.

Design: split the extraction. Code finds candidate spans for free-text fields; Jev picks or verifies. Reserve the LLM for fields that genuinely need generation.

### 2. "Classifying at scale is too expensive and too slow"

Evidence: cost comparisons showing encoder fine-tunes at $12 to $33 per million requests versus $840 to $1,175 for zero-shot GPT and Claude; intent-routing write-ups reporting 200 ms per LLM call becoming unsustainable at 10M requests a day and 5,000 ms routing latencies cut to 100 ms with embeddings; the endless "fine-tune DistilBERT or prompt GPT" threads; Google Sheets users hitting quota errors dragging an AI formula down 500 rows; people scheduling overnight Batch API jobs to get around tokens-per-minute limits.

Why LLMs fail: per-call cost and 200 to 500 ms latency dominate once volume passes tens of thousands a day, and the fine-tuning alternative needs labeled data and MLOps that most teams do not have.

Jev fix: $0.042 per million input tokens with free output, 70 to 500 ms, no training set, labels changed by editing the criteria text. Many questions per request share one state. Batching helpers already exist in the community (`pi-typesafe`'s `evaluateMany`).

Design: one `Choice` per record, or fan out many `Noul`s per record in one call. Keep an `other` option. Chunk to the per-request limit.

### 3. "Temperature 0 and it still flips"

Evidence: GitHub issue on go-openai about inconsistent results at temperature 0; the n8n community thread on the same input producing different outputs; measured flip rates of 2.8% to 7.9% at temperature 0 for GPT mini models, with one question flipping 50% of the time; papers on ChatGPT annotation reliability.

Why LLMs fail: sampling plus hardware nondeterminism plus mixture-of-experts routing, and a label that flips has no attached probability telling you it was a coin toss.

Jev fix: the output is a probability distribution over the options, not a sample from it. Two options at 0.51 and 0.49 show up as exactly that, so code can treat near-ties as "uncertain" instead of discovering the flip in production.

Design: threshold on the top probability or confidence, log the pinned model version with each decision, and re-run calibration when you change versions.

### 4. "The model says it is 95% confident and it is wrong"

Evidence: Nyckel, Refuel and futureagi write-ups and several 2025 to 2026 papers: verbalized confidence is the least reliable method; logprobs cluster above 0.9; raw estimates are "highly unreliable for downstream sample filtering"; teams end up training a separate correctness classifier.

Why LLMs fail: reinforcement learning from human feedback rewards confident-sounding text. The number is prose.

Jev fix: calibration is the training objective (RLCD). Confidence rises with accuracy in aggregate, and independent benchmarks reported it held. This is the single capability that turns every other item in this list from "automate 60% and hope" into "auto-clear what is safe, route the rest."

Design: build a threshold sweep from a few hundred labeled examples; `pi-typesafe` ships a `calibrate()` kit that reports AUC, precision, recall and a recommended threshold.

### 5. "My LLM judge gives the same answer a different score every run"

Evidence: "Rating Roulette" and "Same Input, Different Scores" papers; Evidently, Braintrust and Adaline guides on position, verbosity and self-preference bias; teams voting five judges to stabilize a score.

Why LLMs fail: a rubric score generated as text inherits everything in item 3 and item 4.

Jev fix: `Score` takes the rubric as an ordered list of level descriptions and returns the expected score, the per-level distribution and a confidence. No parsing, no prose bias, same input gives the same distribution.

Design: write levels as concrete situations, not "low/medium/high". Use several narrow `Score`s and combine them with weights in code rather than one holistic grade.

### 6. "The agent picks the wrong tool and burns thousands of tokens deciding"

Evidence: dev.to and TianPan write-ups of the over-tooled agent problem; Berkeley Function Calling Leaderboard accuracy falling from 43% to 2% as tools grow from 4 to 51; MCP servers spending 3,000 to 8,000 tokens on tool schemas before the user's message; a 30-day token audit finding most spend goes to trivial decisions.

Why LLMs fail: the decision is made inside a generation loop that carries the whole context and every tool description.

Jev fix: a `Choice` over tool names with one-line criteria, made in a tenth of a second from a state that contains only the user turn and a summary. Several community packages already do exactly this for coding agents (`jev-use`, `jev-gateway`, `pi-jev-router`, `JevRouter`).

Design: two-stage when tools exceed a few dozen. Keep authorization, argument validation and side effects in code.

### 7. "Guardrails add a second and block harmless requests"

Evidence: NeMo Guardrails measured at 16% false positives with p95 latency above 4 seconds; prompt-guard models rejecting sentences containing "ignore" or "cancel"; the arithmetic that five 90% accurate guards produce a false positive 40% of the time.

Why LLMs fail: each guard is another generation call with its own latency and its own uncalibrated threshold.

Jev fix: several `Noul`s (injection attempt, personal data present, off-topic, self-harm) in one sub-second request, each returning a probability you threshold per risk level. TypeSafe publishes a guardrails cookbook for this.

### 8. "Content moderation false positives are driving users away"

Evidence: OpenAI's moderation model flagging gaming and blockchain language as violence; a third of GPT-4 toxicity false positives triggered by neutral profanity; users tolerating 2 to 3% false positives before they self-censor; small fine-tuned models beating LLMs at moderation and at scam detection (Gemini misclassifying 351 non-scam messages versus 4 for a fine-tuned small model).

Why LLMs fail: general-purpose safety tuning is not your community's rules, and the label has no confidence you can use to route to a human moderator.

Jev fix: your rules become the criteria text; borderline items are visibly borderline. TypeSafe's cookbooks use an explicit "uncertain" outcome and self-consistency checks for moderation.

## Tier 2: non-developer users doing closed-set decisions in ChatGPT by hand

These are the "problems people have all the time" candidates. In each, someone is pasting items into a chat model one at a time, or wiring a Zapier or n8n step, and hitting drift, cost, or inconsistency.

| Who | What they do today | What goes wrong | Jev shape |
|---|---|---|---|
| Bookkeepers | Ask ChatGPT to categorize bank transactions, or accept QuickBooks suggestions | Professionals now advise ChatGPT should never be the thing that categorizes; QuickBooks added a confidence badge because inconsistent categories are the complaint | `Choice` over the client's chart of accounts, confidence-gated; low confidence goes to the bookkeeper's review list |
| Market researchers | Code open-ended survey verbatims with a codebook in the prompt | "Codebook drift, hallucinated codes, no flagging of ambiguity"; label drift across batches is the main reason one-prompt approaches fail | One `Noul` per code per verbatim, fanned out; multi-label with per-code probability, no drift because there is no generation |
| Systematic reviewers | Screen thousands of abstracts with ChatGPT | Inconsistent include/exclude on the same abstract; 75.6% sensitivity and 66.8% specificity in full-text screening; over-inclusive one run, over-rigid the next | `Noul` per eligibility criterion (population, concept, context) plus code for the include rule; abstain band goes to the second human screener |
| Litigation teams | LLM first-pass relevance and privilege review | $1.50 to $3.00 per document manually; LLM consensus systems at $0.017 per document but no court has ruled generated summaries are a defensible basis; defensibility needs recall validation and sampling | `Noul` relevance and privilege per document with calibrated probabilities, which is exactly the statistical footing technology-assisted review protocols expect |
| Support teams | ChatGPT step categorizes tickets, decides on human handoff | Categories drift; escalation misses frustrated customers or escalates too early; teams hand-roll "confidence below 50% twice in a row" rules on top of models that have no real confidence | Fan-out per ticket: `Choice` queue, `Score` frustration, `Noul` asks-for-human, `Noul` refund requested; the escalation rule lives in code |
| Teachers | Grade with a rubric in ChatGPT | Over 60% of scores differ from human grades beyond acceptable bounds; fair to moderate agreement | Per-criterion `Score` with concrete level descriptions; explanation generated separately only for the criteria the teacher opens |
| Recruiters | Rank resumes in ChatGPT | Inconsistent shortlists, missed candidates, compliance reviews; documented disability bias | `Noul` per job requirement with evidence spans, combined in code; the ranking is arithmetic on probabilities, auditable per requirement |
| Product managers | Tag app reviews and feedback into a taxonomy | Fixed taxonomies go stale; LLM tagging is inconsistent across batches; vendors sell this at $25 or more per seat | `Choice` over the taxonomy plus `Noul`s for bug, feature request, churn risk; add `other` and mine it for new categories |
| Freelancers | Browser extensions scoring Upwork posts with an LLM | Slow verdicts, spam slips through | `Noul` spam, `Score` fit, in one call per post, cheap enough to run on every new post |
| Government contractors | Go/no-go screening of solicitations in ChatGPT | "Inconsistent outputs, quality varies with the prompt" | `Noul` per fit criterion (NAICS, set-aside, past performance, place of performance) with the rule in code |
| Advertisers | Pre-screen creatives for platform policy | Google's automated review flagging a stock nurse photo as a medical claim; LLM judges too slow for real-time gating | `Noul` per policy clause, thresholded per clause, human review on the middle band |
| Insurers | LLM triage of first-notice-of-loss narratives | Inconsistent severity and routing across adjusters; teams build confidence flags by hand | `Score` severity, `Choice` claim type, `Noul` injury present and information missing, all from one narrative |
| Medical coders | LLM suggests ICD-10 codes | 33.9% exact match for the best model; fabricated codes; "poor medical coders" per NEJM AI | Not a generation task: retrieve candidate codes in code, then `Choice` among candidates; the retrieve-then-rank design that hit 100% in one study is Jev's native shape |
| Home Assistant users | Local LLM for voice commands | 2 to 3 seconds for "turn off the lights"; users route simple commands around the model | `Choice` over the device and action list in a hundred milliseconds; a community integration already exists |
| Game developers | LLM NPC decisions | 646 ms to 13 seconds per decision; frame budgets allow 20 to 30 ms | Choose an action from a generated legal set; TypeSafe's own Doom demo is this |

## Tier 3: developer patterns where Jev is a drop-in component

- RAG relevance filtering and reranking: `Noul` "does this passage answer the question" per chunk instead of a cross-encoder you host or an LLM reranker you pay for. TypeSafe ships a rerank cookbook; the community Jev Search does this live.
- Hallucination and citation checks: a `Noul` "is this claim supported by this passage" costs a fraction of the second generative call that verification write-ups say can cost 25 times the original answer.
- Entity resolution: pairwise `Noul` "same entity" on the candidate pairs your blocking step produces, replacing the expensive LLM tier in the string-match, embed, LLM funnel everyone describes.
- Extraction validation: small model extracts, Jev `Noul`s check each field is present, supported and relevant, only failures escalate. TypeSafe calls this the SDE cascade.
- Alert and log triage: `Score` severity and `Noul` "explained by an open incident" on each alert; keep the correlation logic in code.
- Duplicate and spam detection on forms and transactions: `Noul` per item at a price where you can run it on everything.

## Where Jev is not the answer (say so to avoid wasted builds)

- Anything that needs prose, code, or an explanation. Pair it with an LLM that only runs on the items Jev routes to it.
- Open-ended discovery of categories. Jev needs the options up front; use an LLM once to propose the taxonomy, then Jev to apply it.
- Long documents judged as a whole. Chunk in code and ask narrow questions per chunk.
- Arithmetic, date logic, counting. Compute first, then ask the semantic question about the computed facts.
- Taxonomies over 255 leaves in one shot, or inputs beyond 32k tokens.
- Non-English at calibrated thresholds without your own validation set.

## If you want one product from this list

Two of the Tier 2 rows are unusually good businesses because the user already pays per decision, the label set is stable, and being wrong has a documented cost: survey verbatim coding for market research agencies, and abstract screening for systematic reviews. Both are sold today as per-response or per-project services, both have peer-reviewed evidence that ChatGPT drifts on them, and both are pure `Noul` fan-outs with a human on the abstain band. Bookkeeping transaction categorization is the biggest audience but Intuit already ships confidence badges, so the wedge would be the independent bookkeeper serving many clients across QuickBooks and Xero.

## Sources

Jev fit and limits: https://amankumar.ai/blogs/jev-measured; https://news.ycombinator.com/item?id=49717558; https://news.ycombinator.com/item?id=49745752; https://systemonemodels.org/examples/articles/jev-is-the-fish-at-the-poker-table/; https://dev.to/webofmike/i-benchmarked-jev-on-agent-tool-call-risk-calibration-held-49i3; https://www.tomshardware.com/tech-industry/artificial-intelligence/typesafe-ais-jev-offers-an-alternative-to-llms-that-claims-to-be-193x-faster-and-445x-cheaper-system-one-type-model-is-bespoke-for-probabilistic-decision-making

Structured output: https://community.openai.com/t/invalid-json-response-when-using-structured-output/1121650; https://community.openai.com/t/structured-output-schema-validation-changed-without-notice-previously-valid-schemas-now-rejected/1384139; https://community.n8n.io/t/ai-model-producing-different-outputs-for-the-same-input-in-n8n-agentic-workflow/84542; https://dev.to/manish169/jsonparse-kept-failing-with-ollama-responses-on-localhost-spent-3-hours-debugging-heres-what-1o79

Cost and latency: https://arxiv.org/html/2602.06370v1; https://medium.com/@durgeshrathod.777/intent-classification-in-1ms-how-we-built-a-lightning-fast-classifier-with-embeddings-db76bfb6d964; https://tianpan.co/blog/2026/04/16/intent-classification-agent-routers; https://gptforwork.com/help/usage/gpt-for-sheets/troubleshooting/rate-limits; https://inference.net/content/openai-rate-limits-guide/

Nondeterminism and confidence: https://github.com/sashabaranov/go-openai/issues/34; https://arxiv.org/pdf/2606.13685; https://www.nyckel.com/blog/calibrating-gpt-classifications/; https://www.refuel.ai/blog-posts/labeling-with-confidence; https://arxiv.org/pdf/2412.14737

Judges: https://arxiv.org/pdf/2510.27106; https://www.cip.org/blog/llm-judges-are-unreliable; https://www.adaline.ai/blog/llm-as-a-judge-reliability-bias

Agents and guardrails: https://tianpan.co/blog/2026/04/19/over-tooled-agent-problem; https://dev.to/aws/reduce-agent-errors-and-token-costs-with-semantic-tool-selection-7mf; https://arxiv.org/html/2605.06669v2; https://arxiv.org/pdf/2410.22770

Moderation and fraud: https://arxiv.org/pdf/2410.13155; https://www.digitalapplied.com/blog/ai-content-moderation-2026-llm-trust-safety-guide; https://arxiv.org/pdf/2606.01475

Non-developer rows: https://justinmckelvey.com/blog/chatgpt-for-bookkeepers; https://quickbooks.intuit.com/learn-support/en-us/help-article/bank-transactions/ai-suggestions-help-match-categorize-bank/L8FHOh4AD_US_en_US; https://btinsights.ai/chatgpt-claude-gemini-open-end-coding/; https://pmc.ncbi.nlm.nih.gov/articles/PMC12831233/; https://www.medrxiv.org/content/10.1101/2025.02.04.25321655.full.pdf; https://www.decover.ai/blog/hidden-cost-document-review/; https://www.eesel.ai/blog/ai-chat-escalation; https://hechingerreport.org/proof-points-ai-essay-grading/; https://dl.acm.org/doi/fullHtml/10.1145/3630106.3658933; https://www.procurementsciences.com/blog/ai-for-government-contracting-vs-chatgpt; https://blog.gobonafide.com/when-ai-becomes-the-ad-police-how-googles-automated-reviews-are-hurting-small-businesses; https://github.com/Adif25/FNOL-Triage; https://ai.nejm.org/doi/full/10.1056/AIdbp2300040; https://community.home-assistant.io/t/voice-command-latency/889423; https://arxiv.org/pdf/2604.07385; https://upwex.io/features/upwork-job-analyzer/
