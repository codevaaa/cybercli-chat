# Brahma V1 model card (pre-release)

## Identity

- Name: Brahma V1
- Creator: CodeVaa team
- Base: `Qwen/Qwen3-VL-8B-Instruct`, pinned to revision `0c351dd01ed87e9c1b53cbc748cba10e6187ff3b`
- Actual base size: 9B parameters (the checkpoint's “8B” product name is not its reported parameter count)
- Base license: Apache-2.0; review and preserve all upstream notices when distributing
- Method: planned 4-bit QLoRA supervised fine-tuning; no base-model merge or from-scratch pretraining
- Status: pre-release; no completed GPU smoke test, training run, or benchmark result is claimed

## Intended use

Local CodeVaa chat, visual UI-to-code, full-stack React/Node project drafting, code completion, and tool-call planning. A bounded isolated project runner is a separate feature and does not make arbitrary generated code safe.

## Hardware limits

Target PC: RX 9070 with 16GB VRAM, Ryzen 7 9700X, 32GB RAM. Initial serving budget: 8K total input context, including image tokens, plus generated output within the same budget. An opt-in 16K run requires successful measured stress testing. The base model's 256K architecture context is not evidence this local machine can serve 256K.

## Training data

No dataset has been downloaded or used yet. Planned sources and their licenses/conditions are recorded in `data/registry.json`. Release requires a completed per-source provenance report and dataset-attribution notices. Held-out evaluation rows must never enter training.

## Evaluations

No model-quality score is available yet. Before release, compare the unmodified base to the adapter on held-out code, FIM, Hindi/Hinglish, tool-call, image-understanding, and screenshot-to-code tasks. Report build/test success, screenshot similarity, context, latency, VRAM, failures, and exact evaluation revisions.

## Limitations

V1 may produce incorrect code, miss visual details, or misunderstand Hindi/Hinglish and tool schemas. No claim of “world best” or superiority to commercial coding models is made. The model must not claim it was pretrained by CodeVaa or that local context is 256K.
