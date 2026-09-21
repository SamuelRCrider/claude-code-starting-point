# Reddit pain-point scan, triaged by Jev

Companion to `docs/jev-pain-point-pass.md`. Reddit was unreachable from the research sandbox, so this script exists to run the pass from a normal network.

```sh
pip install typesafe-sdk
python reddit_pain_scan.py --dry-run                                   # prints the Jev request, no network
python reddit_pain_scan.py --posts-file fixtures/posts.json --dry-run
export TYPESAFE_API_KEY=...
python reddit_pain_scan.py --subs LangChain LLMDevs Bookkeeping --limit 50 --out results.jsonl
```

Each post gets six Jev questions in one request: two `Noul`s (is it LLM pain, is the core task closed-set), two `Choice`s
(pain type, domain), two `Score`s (Jev fit, severity). The `keep` flag and its thresholds are in code so you can tune them
on a labeled sample. Sort `results.jsonl` by `severity` and `jev_fit` and read the top of the list.
