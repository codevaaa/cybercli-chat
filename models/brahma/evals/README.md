# Brahma V1 evaluation

`tasks.json` holds fixed checks for coding, IDE completion, Hindi/Hinglish, tool calls, image understanding, and screenshot-to-React. The settings screenshot is synthesized locally by `create_fixtures.py`; it contains no third-party material. These prompts never enter the training corpus.

After the smoke gate and adapter training:

```bash
models/brahma/.venv/bin/python models/brahma/evals/create_fixtures.py
PYTHONPATH=models/brahma/src models/brahma/.venv/bin/python models/brahma/evals/evaluate.py --compare --context 8192
PYTHONPATH=models/brahma/src models/brahma/.venv/bin/python models/brahma/evals/evaluate.py --compare --context 16384 --include-stress
```

Reports include each response, category checks, failures, device, and peak VRAM. Lexical checks are triage only. Human review and sandbox execution are required before publishing capability claims. The context stress run does not raise the advertised limit by itself.

The small SWE-bench Verified check is tracked in `swebench-provenance.json`. Its current card does not declare a dataset license, so no benchmark data or repository has been downloaded or bundled pending review. The CodeVaa builder endpoint separately runs its generated project suite in the network-isolated Docker runner.
