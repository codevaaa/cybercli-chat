# Frozen Codeva dossier eval

`D:\gptulternative\gptulternative\evals\frozen` contains 50 checked-in JSON prompt records with explicit expected dossier checks: byte-stable multilingual originals, unaccepted build gates, public/private contradictions, hidden builder summaries, missing judge/replay evidence, and supported/unsupported commerce-note queries. General and CS remain. These are dossier invariants, not a claim of model quality or 50 fully generated Docker apps.

From the existing repo root:

```powershell
node evals/run.mjs --mode=fixture
node --test evals/eval.test.mjs
```

Fixture mode invokes actual domain, citation and replay functions on fixed local data and disables fetch. It makes no network/model/storage call. Every record must pass: the script prints the pass rate and exits 1 for any regression. The test copies fixtures into a temporary directory, changes one expected check and proves a 49/50 run exits 1. It does not modify the frozen originals.

Live mode uses the existing authenticated studio API and existing store/providers:

```powershell
$env:CODEVA_EVAL_API_URL = 'http://localhost:3000/api/v1'
# Set CODEVA_EVAL_ACCESS_TOKEN privately to an existing TEST account's access JWT.
node evals/run.mjs --mode=live
```

It creates 50 labelled test projects, waits for the actual conductor, reviews the generated lines to check their gate, and uploads/queries the commerce notes through the same owned API. It does not start generated builds, charge Razorpay, call providers directly or delete existing projects. Only this explicit live command calls configured services; it can consume existing provider usage and leaves its test projects in the existing store. Frozen checks are not changed to accommodate a model's answer. Live mode has not been executed here. Full build/test/judge/preview acceptance remains separately required.
