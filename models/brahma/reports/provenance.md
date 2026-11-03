# Brahma V1 data and skills provenance

This is the initial source audit. It records pinned revisions and clear release gates; it does not claim any dataset has been downloaded or used. Dataset downloads stay blocked until `reports/rocm-smoke.json` shows a finite loss and adapter backward pass on the RX 9070.

## Base model

- `Qwen/Qwen3-VL-8B-Instruct`, revision `0c351dd01ed87e9c1b53cbc748cba10e6187ff3b`.
- The model card reports 9B parameters and Apache-2.0. Brahma is an adapter fine-tune; model identity and release card must preserve the base attribution.

## Training sources

| Source | Pinned revision | License and use | Status |
| --- | --- | --- | --- |
| NVIDIA OpenCodeInstruct | `8f3ba5bafe4d6e8db46082cf7ae6741bc370604d` | CC-BY-4.0. Stream at most 12K code rows with score >= 0.9, >=90% passing execution statuses, bounded text, and deterministic 5% internal holdout. Attribute NVIDIA and the dataset. | Approved for filtered download after the GPU smoke gate. |
| Fluent Dev UI | `10db9c345bcff2d0d7904adfcd55f307031cb1a5` | Dataset card says MIT; use its train split for training and official validation split for evaluation. The card says original implementations are preserved but does not enumerate each component contributor's source license. Re-review before public checkpoint release. | Approved for local filtered experiment after smoke; public release requires source-rights review. |
| WebSight | `b11f8172f89c992b56ac702319e02c428cca4a4e` | CC-BY-4.0, and its terms ask users to comply with underlying source licenses. | Blocked; no sample download until source provenance is reviewed. |
| CodeVaa synthetic seed | local `brahma-v1-seed-1` | Seven authored synthetic examples in `prepare_data.py`; no repository source is included. | Approved as the limited local seed. |
| CodeVaa repository samples | no revision | Future internal FIM/tool-use traces; per-file rights attestation, secret scanning, and source-level holdout required. | Blocked; no project files are approved for training. |
| SWE-bench Verified | no revision pinned | Evaluation only. The current card does not declare a dataset license, and each source repository has its own license. | No dataset or repository downloaded. See `evals/swebench-provenance.json`. |

The training script reads only `data/processed/train.jsonl`. OpenCode and Fluent validation rows are held out in `data/processed/eval.jsonl`. Agent benchmarks never enter training. Image examples from Fluent Dev are decoded, pixel-bounded, and copied into the ignored `data/images/` folder. WebSight is not read by the current pipeline.

## Skills

Skills are retrieval references, never shell commands or executable plugins. Runtime selection reads only entries marked approved in `skills/manifest.json` and wraps each excerpt as untrusted reference text.

- `wshobson/agents/nodejs-backend-patterns` uses MIT-licensed source at commit `156b7a5e7a8b93642628a339ee4039c925b34c7f`; the MIT notice is stored beside the reviewed, CodeVaa-adapted skill text.
- Frontend design, React practices, and security practices are short CodeVaa-authored references (`internal-v1`).
- Skills.sh entries from Anthropic, Vercel, and OpenAI remain blocked because a compatible source license was not verified; their contents were not copied.
- The Skills.sh catalog/API was used according to its published docs; its API required an OIDC token unavailable in this session, so the public catalog and CLI were used without bulk scraping.

## Hardware and benchmark report gates

- Host: Windows 11, WSL2 Ubuntu 24.04.5, Ryzen 7 9700X, RX 9070 (16GB VRAM), 32GB RAM. The latest WSL filesystem report showed about 290GB available on D:.
- AMD's official ROCm 10.0 wheel install was attempted for `gfx1201`. The current preflight and smoke reports will be written under this directory; until `rocm-smoke.json` passes, no model or dataset downloads may run.
- `evals/tasks.json` holds separate coding, completion, Hindi/Hinglish, tool-use, image-reading, and screenshot-to-UI checks. The evaluation runner records response text, errors, and peak VRAM. Human review and execution are required before claiming a pass.
- Context: 8K is the serve target. 16K is a stress experiment and cannot be advertised based on model architecture alone.
