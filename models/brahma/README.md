# Brahma V1

Brahma is the CodeVaa team's local vision-and-coding model. V1 is a fine-tune of [`Qwen/Qwen3-VL-8B-Instruct`](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct), whose card currently identifies the checkpoint as 9B actual parameters and Apache-2.0. Brahma is not trained from scratch. The identity prompt and model card disclose the base model.

## Current status

- Workspace and reproducible scripts are being prepared under this directory.
- The Windows machine has an AMD Radeon RX 9070 (16GB VRAM), 32GB system RAM, and about 290GB free on D: at the last WSL check.
- Ubuntu 24.04 WSL was installed. ROCm/PyTorch GPU visibility and a QLoRA forward/backward smoke run have **not** passed yet. Training is gated on both.
- No training corpus has been downloaded yet. Dataset preparation refuses to run without a passing smoke report.
- V1 local context starts at 8K tokens; do not advertise 16K until a measured stress report exists. Qwen's native 256K context is not the PC's validated context.
- Docker Desktop currently cannot run containers on this host (virtualization is unavailable per the existing host dossier). The app-builder sandbox fails closed until Docker reports a working engine.

## Workspace map

- `config/`: pinned base revision and training/runtime limits.
- `src/brahma/`: data validation, QLoRA training, local OpenAI-compatible serving.
- `data/`: license registry and processed data; raw/downloaded files stay here.
- `skills/`: reviewed skills, source revisions, licenses, and retrieval index.
- `builder/`: path-safe project writer and isolated Docker runner.
- `evals/`: held-out prompts and execution-evaluation records.
- `reports/`: hardware, smoke, training, evaluation, and provenance reports.
- `artifacts/`: adapters and exported checkpoints.

Large weights, datasets, caches, logs, and adapters are git-ignored. Keep their paths under this folder on D:.

## Runtime setup

Open Ubuntu 24.04 from WSL, then from the repo at `/mnt/d/gptulternative/gptulternative`:

```bash
sudo apt-get update && sudo apt-get install -y python3.12-venv
bash models/brahma/scripts/setup_wsl.sh
```

This installs the pinned ROCm PyTorch wheel into `models/brahma/.venv`; it does not install Windows drivers. The current AMD Windows driver is 26.8.1, which matches AMD's ROCm 10.0 RX 9070 compatibility row. The machine's actual WSL/PyTorch visibility still has to be checked with:

```bash
models/brahma/.venv/bin/python models/brahma/scripts/preflight.py
models/brahma/.venv/bin/python -m brahma.smoke_test
```

Only after `reports/rocm-smoke.json` records a passing GPU backward step may curated dataset downloads begin:

```bash
models/brahma/.venv/bin/python -m brahma.prepare_data --after-smoke models/brahma/reports/rocm-smoke.json
```

Then train a single LoRA adapter (base weights remain unchanged):

```bash
models/brahma/.venv/bin/python -m brahma.train
```

The training defaults use 4-bit NF4 QLoRA, micro-batch 1, gradient checkpointing, a 4K training sequence budget, frozen vision encoder, decoder adapters, and the visual merger as a trainable connector. These settings must pass the GPU smoke test before the corpus is fetched.

## Serve locally

Set `BRAHMA_API_KEY` in the host environment and the same key for the CodeVaa backend. Start the server bound to loopback only:

```bash
BRAHMA_API_KEY='your-local-secret' models/brahma/.venv/bin/uvicorn brahma.api:app --app-dir models/brahma/src --host 127.0.0.1 --port 8765
```

The API exposes `/health`, `/v1/models`, and OpenAI-compatible `/v1/chat/completions` with inline image inputs, streaming, and tool-call result parsing. Remote image URLs are rejected to prevent server-side request forgery. The backend alias is `brahma-v1`; its failure never falls through to a cloud provider.

## Local full-stack builder

The separate `/v1/builder/generate` endpoint accepts a project brief and an optional inline screenshot. CodeVaa forwards authenticated requests from `POST /api/v1/brahma/build` to the loopback-only model service. Brahma retrieves approved design, React, Node, and security notes; generates a React/TypeScript frontend and Express backend; then runs dependency setup, tests, and build in a Docker container with no network, a read-only root, resource limits, and only the generated workspace mounted writable. It permits up to two repair rounds and returns the built `dist/index.html` path for preview. The Dossier Python/SQLite sandbox remains separate.

Build the pinned builder image once from the model folder:

```bash
docker build -t codevaa-brahma-builder:node22 models/brahma/builder
```

Image creation downloads the fixed dependency set; generated project containers use the image's offline npm cache and run with `--network=none`. The project runner fails closed when Docker is unavailable or the generated package set/scripts differ from the allowlist. The current host Docker engine still needs virtualization enabled before this acceptance path can run.

## Training corpus and licenses

`data/registry.json` is the source-of-truth license manifest. The pipeline streams a filtered subset of NVIDIA OpenCodeInstruct, WebSight, and Fluent Dev rather than mirroring their full releases. OpenCodeInstruct rows must have strong execution scores and passing test statuses. Screenshot examples must be decodable and paired with code. Near-duplicate and evaluation split checks run before training. Every retained row records its dataset/source ID.

The ODSC agent-dataset article is used to select execution-based evaluations, not as a bulk-download list. Agent benchmarks remain held out. Skills are runtime retrieval documents, not executable plugins or automatic training text.

## Skills

Candidates discovered via Skills.sh are tracked in `skills/manifest.json`. Only a skill with an explicit compatible source license and a reviewed content/security check may be copied into the runtime index. Skills are treated as untrusted reference text and are never executed. The public Skills.sh API required a Vercel OIDC token during this run; discovery therefore used its public catalog pages and the documented `npx skills` CLI, without bulk scraping.

## Validation

Run the CPU-only unit suite without GPU downloads:

```powershell
py -3.12 -m unittest discover -s models/brahma/tests -v
```

After GPU setup, run the smoke test, then data preparation, training, baseline-versus-adapter evaluation, and serving tests. The full-stack project runner uses Docker `--network none`, resource/process limits, a single writable project mount, and only `npm ci --offline`, `npm test`, and `npm run build`. It will refuse to run if Docker is unavailable or the project escapes its workspace.

## References

- [AMD ROCm 10.0 compatibility](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html)
- [Hugging Face bitsandbytes ROCm support](https://huggingface.co/docs/bitsandbytes/main/en/installation)
- [Skills.sh API](https://www.skills.sh/docs/api) and [CLI](https://www.skills.sh/docs/cli)
- [ODSC: datasets for training and evaluating AI agents](https://opendatascience.com/15-datasets-for-training-and-evaluating-ai-agents/)
