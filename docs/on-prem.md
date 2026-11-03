# Existing Codeva API on-prem profile

`compose.on-prem.yml` runs the existing API, dossier worker, private preview API, Mongo, Redis queue, Ollama local gateway and sandbox image. It does not migrate existing production Mongo/Supabase accounts or replace authentication. Supply the existing approved `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` privately in the environment. The backend service key must never reach the frontend/editor or a generated sandbox.

From the existing repository root:

```sh
docker compose -f compose.on-prem.yml --profile on-prem up --build -d
docker compose -f compose.on-prem.yml --profile on-prem exec local-gateway ollama pull qwen2.5-coder:7b
docker compose -f compose.on-prem.yml --profile on-prem exec local-gateway ollama pull llama3.2:3b
```

Boot does not download a model or call a public LLM. Pulling the local model weights is an explicit setup action. Set distinct local judge/vision model IDs supported by the local gateway before screenshot review; `DOSSIER_LOCAL_VISION_MODEL` and `DOSSIER_LOCAL_VISION_JUDGE_MODEL` remain unset by default and unsupported vision must fail visibly. The `7b`/`3b` defaults are configuration, not certification of quality or latency on this host.

The API binds loopback port 3000 and preview binds the distinct origin on 3001 by default. Put them behind appropriate HTTPS infrastructure for other computers; `DOSSIER_PREVIEW_ORIGIN` must differ from the frontend origin. In the installed IDE, set `codeva.apiBaseUrl` to that existing API's `/api/v1` URL and `codeva.webUrl` to the existing approved website/auth origin. Plain HTTP settings are accepted only for loopback development.

`DOSSIER_LOCAL_GATEWAY_URL` takes the existing dossier path to the local gateway before public provider selection. Different model IDs remain required for independent sensitive-change reviews. The Python sandbox is a bounded generated-app runtime with owner rows and reviewed declarative schema; it is not an unrestricted application hosting service. The API/runtime use the host Docker socket to manage disposable sandbox containers, so they belong on a trusted operator-controlled host.

`scripts/ide/verify-on-prem.mjs` boots a separately named real Compose environment with network observers and removes its own services/volumes afterward. Its auth endpoint is intentionally unavailable because it checks boot, not login. Latest `on-prem.json` records all seven services running and no public model attempt from API/runtime/preview. It does not certify an air-gapped identity deployment or a paid model-generated project.
