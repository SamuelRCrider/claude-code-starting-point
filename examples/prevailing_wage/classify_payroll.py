"""Certified-payroll pre-audit with Jev (TypeSafe AI).

Flow:
  1. Load a wage determination (WD): from SAM.gov by number, or from a local JSON fixture.
  2. Load a certified payroll (list of worker-weeks).
  3. Stage 1: Jev picks the trade group for each worker-week (small Choice).
  4. Stage 2: Jev picks the exact classification within that group (Choice + `other`),
     plus a fan-out of Noul duty checks.
  5. Code does every number: rate vs WD, fringe vs WD, routing by confidence.

Run without a key to see the exact requests:
  python classify_payroll.py --wd fixtures/wd_sample.json --payroll fixtures/payroll_sample.json --dry-run
Run for real:
  export TYPESAFE_API_KEY=...
  python classify_payroll.py --wd fixtures/wd_sample.json --payroll fixtures/payroll_sample.json
Fetch a WD from SAM.gov instead of the fixture (endpoint documented by third parties, not verified here):
  python classify_payroll.py --wd-number CA20260001 --wd-revision 3 --payroll ... --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

# Routing thresholds. These are placeholders: calibrate them on labeled payrolls
# (for example the California DIR eCPR public records) and re-calibrate whenever
# you change the pinned model version.
AUTO_CLEAR_CONFIDENCE = 0.85
REVIEW_CONFIDENCE = 0.60
MODEL = "jev-latest"  # pin to a versioned id such as "jev-1.13.0" in production

SAM_WD_URL = "https://sam.gov/api/prod/wdol/v1/wd/{number}/{revision}/download"


@dataclass(frozen=True)
class Classification:
    code: str          # e.g. "ELEC0011-004"
    title: str         # e.g. "ELECTRICIAN (Including Low Voltage Wiring)"
    group: str         # trade group derived from the code prefix, e.g. "ELEC"
    rate: float
    fringe: float
    scope: str = ""    # scope-of-work text if the WD or state determination provides it


def load_wd(path: str | None, number: str | None, revision: str | None) -> list[Classification]:
    if path:
        with open(path) as f:
            raw = json.load(f)
    else:
        import urllib.request

        url = SAM_WD_URL.format(number=number, revision=revision)
        with urllib.request.urlopen(url, timeout=30) as resp:  # noqa: S310
            raw = json.loads(resp.read())
        raw = normalize_sam_wd(raw)
    return [
        Classification(
            code=c["code"],
            title=c["title"],
            group=c.get("group") or re.split(r"[0-9]", c["code"], maxsplit=1)[0],
            rate=float(c["rate"]),
            fringe=float(c.get("fringe", 0)),
            scope=c.get("scope", ""),
        )
        for c in raw["classifications"]
    ]


def normalize_sam_wd(raw: dict[str, Any]) -> dict[str, Any]:
    """Map the SAM.gov download payload to the fixture shape.

    The SAM.gov payload is not verified from this environment; adjust the field
    names here once you have looked at a real response.
    """
    rows = raw.get("classifications") or raw.get("rates") or []
    return {"classifications": [
        {"code": r.get("code") or r.get("classificationCode"),
         "title": r.get("title") or r.get("classification"),
         "rate": r.get("rate") or r.get("baseRate"),
         "fringe": r.get("fringe") or r.get("fringes") or 0}
        for r in rows
    ]}


def load_payroll(path: str) -> list[dict[str, Any]]:
    with open(path) as f:
        return json.load(f)["worker_weeks"]


# ---------- question builders (pure functions so they can be unit tested) ----------

def stage1_questions(groups: dict[str, list[Classification]]) -> dict[str, Any]:
    criteria = {
        g: "; ".join(sorted({c.title for c in cs}))[:400] for g, cs in groups.items()
    }
    criteria["other"] = "No trade group on this wage determination fits the described work."
    return {
        "trade_group": {
            "type": "choice",
            "instructions": "Which trade group on the wage determination covers the work described in `worker.duties`, `worker.equipment`, and `worker.employer_label`?",
            "criteria": criteria,
        }
    }


def stage2_questions(cands: list[Classification]) -> dict[str, Any]:
    criteria: dict[str, Any] = {
        c.code: {"title": c.title, "scope": c.scope} if c.scope else c.title for c in cands
    }
    criteria["other"] = "None of these classifications matches the described work; a conformance request (SF-1444) may be needed."
    return {
        "classification": {
            "type": "choice",
            "instructions": "Based on actual duties, not the job title, which classification applies to this worker-week?",
            "criteria": criteria,
        },
        # Fan-out duty checks. Each is a crisp, observable proposition.
        "operates_power_equipment": {
            "type": "noul",
            "instructions": "Do `worker.duties` or `worker.equipment` describe operating power-driven construction equipment (crane, excavator, loader, forklift, pump)?",
        },
        "performs_licensed_trade_work": {
            "type": "noul",
            "instructions": "Do `worker.duties` describe work that is customarily performed by a licensed journeyman trade (electrical, plumbing, pipefitting, elevator)?",
        },
        "duties_match_employer_label": {
            "type": "noul",
            "instructions": "Is `worker.employer_label` consistent with the work described in `worker.duties`?",
        },
        "split_classification_week": {
            "type": "noul",
            "instructions": "Do `worker.duties` or `worker.timecard_notes` indicate the worker performed work in more than one trade during the week?",
        },
    }


def state_for(ww: dict[str, Any]) -> dict[str, Any]:
    # Send only the evidence the questions refer to.
    return {"worker": {
        "employer_label": ww.get("employer_label", ""),
        "duties": ww.get("duties", ""),
        "equipment": ww.get("equipment", ""),
        "timecard_notes": ww.get("timecard_notes", ""),
    }}


# ---------- Jev call ----------

def ask(client: Any, state: dict[str, Any], questions: dict[str, Any], dry_run: bool) -> dict[str, Any] | None:
    if dry_run:
        print(json.dumps({"model": MODEL, "state": state, "questions": questions}, indent=2))
        return None
    resp = client.system_one(state=state, questions=questions, model=MODEL)
    return {name: ans.model_dump() for name, ans in resp.answers.items()} | {"_model": resp.model}


def route(answer: dict[str, Any]) -> str:
    if answer["choice"] == "other":
        return "CONFORMANCE_CHECK"
    if answer["confidence"] >= AUTO_CLEAR_CONFIDENCE:
        return "AUTO_CLEAR"
    if answer["confidence"] >= REVIEW_CONFIDENCE:
        return "REVIEW"
    return "REVIEW_LOW_CONFIDENCE"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wd", help="local WD fixture JSON")
    ap.add_argument("--wd-number")
    ap.add_argument("--wd-revision", default="0")
    ap.add_argument("--payroll", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not args.wd and not args.wd_number:
        ap.error("give --wd or --wd-number")

    wd = load_wd(args.wd, args.wd_number, args.wd_revision)
    by_code = {c.code: c for c in wd}
    groups: dict[str, list[Classification]] = defaultdict(list)
    for c in wd:
        groups[c.group].append(c)

    client = None
    if not args.dry_run:
        from typesafe_sdk import TypeSafeClient  # pip install typesafe-sdk
        client = TypeSafeClient()

    findings = []
    try:
        for ww in load_payroll(args.payroll):
            state = state_for(ww)
            s1 = ask(client, state, stage1_questions(groups), args.dry_run)
            if s1 is None:
                cands = wd  # dry run: show stage 2 over the whole list
            else:
                g = s1["trade_group"]["choice"]
                cands = groups.get(g, wd) if g != "other" else wd
            s2 = ask(client, state, stage2_questions(cands), args.dry_run)
            if s2 is None:
                continue

            cls_ans = s2["classification"]
            decision = route(cls_ans)
            chosen = by_code.get(cls_ans["choice"])
            checks = {k: round(v["noul"], 2) for k, v in s2.items() if isinstance(v, dict) and v.get("type") == "noul"}

            # Everything numeric stays in code.
            issues = []
            if chosen:
                if float(ww["rate"]) + 1e-9 < chosen.rate:
                    issues.append(f"base rate {ww['rate']} below WD {chosen.rate}")
                if float(ww.get("fringe", 0)) + 1e-9 < chosen.fringe and not ww.get("fringe_paid_to_plan"):
                    issues.append(f"fringe {ww.get('fringe', 0)} below WD {chosen.fringe}")
                if ww.get("employer_code") and ww["employer_code"] != chosen.code:
                    issues.append(f"employer used {ww['employer_code']}, model picked {chosen.code}")
            if checks.get("operates_power_equipment", 0) > 0.8 and chosen and chosen.group.startswith("LABO"):
                issues.append("laborer classification but duties describe equipment operation")
            if checks.get("split_classification_week", 0) > 0.8:
                issues.append("possible split-classification week; hours must be recorded per classification")

            findings.append({
                "worker": ww["name"], "decision": decision, "classification": cls_ans["choice"],
                "confidence": round(cls_ans["confidence"], 3),
                "alternatives": sorted(cls_ans["probabilities"].items(), key=lambda kv: -kv[1])[:3],
                "checks": checks, "issues": issues, "model": s2["_model"],
            })
    finally:
        if client is not None:
            client.close()

    if findings:
        print(json.dumps(findings, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
