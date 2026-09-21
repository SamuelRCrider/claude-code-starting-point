"""Reddit pain-point scan, triaged by Jev.

Pulls recent threads from a list of subreddits for a list of keywords through
Reddit's public JSON endpoints, then asks Jev, per post, whether it describes a
problem with a conventional LLM that has a closed-set decision at its core.

Reddit's JSON endpoints work unauthenticated at low volume from a normal network
with a descriptive User-Agent. This sandbox cannot reach Reddit, so the script was
validated only in --dry-run and --posts-file modes. For sustained use, switch the
fetcher to PRAW with a registered app.

  python reddit_pain_scan.py --dry-run                       # print requests, no network
  python reddit_pain_scan.py --posts-file fixtures/posts.json --dry-run
  export TYPESAFE_API_KEY=...
  python reddit_pain_scan.py --subs LangChain LLMDevs LocalLLaMA --limit 50 --out results.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from typing import Any

MODEL = "jev-latest"
USER_AGENT = "pain-point-research/0.1 (contact: set-me)"

DEFAULT_SUBS = [
    "LangChain", "LLMDevs", "LocalLLaMA", "OpenAI", "ClaudeAI", "MachineLearning", "datascience",
    "AI_Agents", "PromptEngineering", "Rag", "SaaS", "startups", "smallbusiness", "Entrepreneur",
    "webdev", "ExperiencedDevs", "sysadmin", "devops", "n8n", "zapier", "Bookkeeping", "Accounting",
    "recruiting", "CustomerSuccess", "ecommerce", "homeassistant", "gamedev", "marketing",
]
DEFAULT_KEYWORDS = [
    "json parse", "structured output", "classify", "classification", "categorize", "too expensive",
    "too slow", "latency", "inconsistent", "temperature 0", "confidence score", "false positive",
    "moderation", "triage", "routing", "intent", "rerank", "guardrail", "prompt injection",
    "wrong tool", "hallucinat", "labeling", "tagging", "dedup", "entity matching",
]

# ---------- Jev question set (evaluated per post) ----------

def questions() -> dict[str, Any]:
    return {
        "is_llm_pain": {
            "type": "noul",
            "instructions": "Does `post` describe a concrete problem the author had using a large language model or chat AI (cost, speed, reliability, consistency, format, accuracy)?",
        },
        "closed_set_core": {
            "type": "noul",
            "instructions": "Is the core task in `post` a decision with a known answer space (choose a category, yes/no, a level on a scale), rather than writing text or code?",
        },
        "pain_type": {
            "type": "choice",
            "instructions": "Which is the main complaint in `post`?",
            "criteria": {
                "format_breaks": "Output is not valid or not parseable (JSON, schema, extra text).",
                "cost": "Too expensive at the author's volume.",
                "latency": "Too slow for the use case.",
                "inconsistency": "Same input gives different answers, drift across batches.",
                "no_confidence": "Cannot tell when the model is unsure, no usable confidence.",
                "false_positives": "Flags or blocks things it should not.",
                "accuracy": "Plain wrong answers on the task.",
                "other": "None of the above.",
            },
        },
        "domain": {
            "type": "choice",
            "instructions": "What domain is `post` about?",
            "criteria": {
                "support": "Customer support, tickets, chatbots, escalation.",
                "moderation": "Content moderation, spam, fraud, safety.",
                "data_labeling": "Labeling, tagging, categorizing records or documents.",
                "agents": "Agent tool selection, routing, orchestration.",
                "rag": "Retrieval, reranking, relevance, citation checks.",
                "finance_ops": "Bookkeeping, invoices, transactions, expenses.",
                "hiring": "Resumes, candidates, screening.",
                "research": "Survey coding, abstract screening, qualitative coding.",
                "legal_compliance": "Document review, policy checks, compliance.",
                "consumer": "Personal productivity, email, smart home, games.",
                "other": None,
            },
        },
        "jev_fit": {
            "type": "score",
            "instructions": "How well would a typed decision model (returns a label, yes/no probability, or rubric score with calibrated confidence, no text) solve the problem in `post`?",
            "criteria": [
                "Not applicable: the task needs generated text, code, or open-ended reasoning.",
                "Partial: a decision step could be offloaded but most of the work remains generative.",
                "Strong: the whole problem is one or a few closed-set decisions with a fallback path.",
            ],
        },
        "severity": {
            "type": "score",
            "instructions": "How much does this problem cost the author?",
            "criteria": [
                "Curiosity or a minor annoyance.",
                "Recurring time or money loss in a side project or small workflow.",
                "Blocking a production system, a business process, or a paying customer.",
            ],
        },
    }


def state_for(post: dict[str, Any]) -> dict[str, Any]:
    body = (post.get("selftext") or "")[:4000]
    return {"post": {"subreddit": post.get("subreddit"), "title": post.get("title"), "body": body}}


# ---------- Reddit fetch ----------

def fetch_reddit(sub: str, keyword: str, limit: int, sleep_s: float) -> list[dict[str, Any]]:
    q = urllib.parse.urlencode({"q": keyword, "restrict_sr": 1, "sort": "new", "t": "year", "limit": limit})
    url = f"https://www.reddit.com/r/{sub}/search.json?{q}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
        data = json.loads(resp.read())
    time.sleep(sleep_s)
    out = []
    for child in data.get("data", {}).get("children", []):
        d = child.get("data", {})
        out.append({
            "id": d.get("id"), "subreddit": d.get("subreddit"), "title": d.get("title"),
            "selftext": d.get("selftext"), "score": d.get("score"), "num_comments": d.get("num_comments"),
            "url": "https://www.reddit.com" + d.get("permalink", ""), "created_utc": d.get("created_utc"),
            "keyword": keyword,
        })
    return out


# ---------- main ----------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subs", nargs="*", default=DEFAULT_SUBS)
    ap.add_argument("--keywords", nargs="*", default=DEFAULT_KEYWORDS)
    ap.add_argument("--limit", type=int, default=25, help="posts per sub/keyword")
    ap.add_argument("--sleep", type=float, default=2.0, help="seconds between Reddit requests")
    ap.add_argument("--posts-file", help="skip Reddit; load posts from JSON list")
    ap.add_argument("--out", default="results.jsonl")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    posts: list[dict[str, Any]]
    if args.posts_file:
        with open(args.posts_file) as f:
            posts = json.load(f)
    elif args.dry_run:
        posts = [{"id": "demo", "subreddit": "LangChain", "title": "Structured output keeps returning invalid JSON ~1% of the time",
                  "selftext": "We classify support tickets into 12 queues with gpt. About 1 in 100 responses is not parseable and the retry doubles cost. Any way to get a confidence too?"}]
    else:
        seen: dict[str, dict[str, Any]] = {}
        for sub in args.subs:
            for kw in args.keywords:
                try:
                    for p in fetch_reddit(sub, kw, args.limit, args.sleep):
                        seen.setdefault(p["id"], p)
                except Exception as e:  # noqa: BLE001
                    print(f"fetch failed r/{sub} {kw!r}: {e}", file=sys.stderr)
        posts = list(seen.values())
        print(f"fetched {len(posts)} unique posts", file=sys.stderr)

    qs = questions()
    if args.dry_run:
        for p in posts[:1]:
            print(json.dumps({"model": MODEL, "state": state_for(p), "questions": qs}, indent=2))
        print(f"dry run: {len(posts)} posts would be triaged", file=sys.stderr)
        return 0

    from typesafe_sdk import TypeSafeClient  # pip install typesafe-sdk
    kept = 0
    with TypeSafeClient() as client, open(args.out, "w") as out:
        for p in posts:
            r = client.system_one(state=state_for(p), questions=qs, model=MODEL)
            a = {k: v.model_dump() for k, v in r.answers.items()}
            row = {
                "url": p.get("url"), "subreddit": p.get("subreddit"), "title": p.get("title"),
                "is_llm_pain": a["is_llm_pain"]["noul"], "closed_set_core": a["closed_set_core"]["noul"],
                "pain_type": a["pain_type"]["choice"], "pain_conf": a["pain_type"]["confidence"],
                "domain": a["domain"]["choice"], "jev_fit": a["jev_fit"]["score"], "severity": a["severity"]["score"],
                "model": r.model,
            }
            # Thresholds live in code. Tune on a labeled sample.
            row["keep"] = row["is_llm_pain"] >= 0.7 and row["closed_set_core"] >= 0.6 and row["jev_fit"] >= 1.5
            kept += row["keep"]
            out.write(json.dumps(row) + "\n")
    print(f"wrote {args.out}; {kept}/{len(posts)} posts flagged as Jev-shaped pain", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
