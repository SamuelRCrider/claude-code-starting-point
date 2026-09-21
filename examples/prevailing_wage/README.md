# Prevailing-wage certified payroll pre-audit with Jev

Starter harness for the recommendation in `docs/jev-public-data-moat.md`.

```sh
pip install typesafe-sdk
python classify_payroll.py --wd fixtures/wd_sample.json --payroll fixtures/payroll_sample.json --dry-run   # prints requests only
export TYPESAFE_API_KEY=...
python classify_payroll.py --wd fixtures/wd_sample.json --payroll fixtures/payroll_sample.json
```

What it does: two-stage `Choice` (trade group, then exact classification with an `other` escape hatch), a fan-out of `Noul`
duty checks per worker-week, and all rate, fringe, and routing logic in plain Python. Thresholds at the top of the file are
placeholders until you calibrate them on labeled payrolls.
