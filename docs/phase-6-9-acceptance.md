# Months 6–9 acceptance

**NOT DONE. Any FAIL means not done.** This records executed tests and their scope. An isolated fixture, unit test or source change is not a paid model-generated production project or a clean OS installation.

| # | Required check | Result | Evidence / remaining work |
| --- | --- | --- | --- |
| 1 | Exact base, no later tag merge | PASS | `node editors/verify.mjs`: `BASE.txt` exactly `1.139.0`, HEAD/tag both `2242ebbb54efeeb0129e08e919e7e8d43033cd83`. |
| 2 | MrCodevaa title, About, sidebar and installer | PASS | Actual Windows installer and installed Electron title/About/sidebar checks in `installed-smoke/native.json`. New account/Chat icon changes have their own native check below. |
| 3 | Prism M master, readable small icon, exact face colors | PASS | Master SVG and real installed executable icon; `test-installed-windows.ps1` verifies all three face colors. Native icon screenshot saved. |
| 4 | Default palette and branded empty window | PASS | Installed Electron CSS colors checked against `#C4622D` / `#0B0C0F`; actual empty-window screenshot and branded prompt. |
| 5 | Download serves rebuilt installer, installed shortcut Prism M | FAIL | Windows setup/shortcut are real; public local download serves actual installer bytes/hash. Production publication and native Mac/Linux builds remain absent. |
| 6 | Installed inline accept/reject round-trip | FAIL | API/client tests cover both decisions and server ownership. No signed-in installed-editor project round trip certified. |
| 7 | Local Tab off/late paints nothing, no free chat call | PASS | Client unit tests and actual warmed Ollama timeout check; only the local `/studio/tab` endpoint is called. |
| 8 | IDE/web checkpoint restore same API/database | FAIL | Both clients target the same rollback API; actual Docker code/database/preview restore passes. Signed-in native checkpoint round trip remains unverified. |
| 9 | Native/web judges and original prompt bytes match | FAIL | Exact-byte API/DOM tests pass. Real production account/native project open and two generated judge results are not certified. |
| 10 | Existing VSIX builds and normal chat answers | PASS | Existing CyberCoder VSIX 0.6.2 built/installed; real standard chat persisted two Mongo messages, `normal-chat.json`. Latest APINEX 402 recovered through actual OpenRouter; this is not an APINEX success. |
| 11 | Different real role IDs write one generated app, Scribe records it | FAIL | Separate-directory role state machine and event report tests pass. Latest APINEX functional generation blocked during file output before a completed app. |
| 12 | UI/API mismatch blocks Contract before merge | PASS | State-machine mismatch regression tests and sandbox contract checks; generated-source AST is checked without running it during merge validation. |
| 13 | Idempotent migration / seeds | PASS | `live-sandbox.json`: twice-run actual Docker migrations return version 1 and four rows with no duplicates. |
| 14 | Preview down fails despite unit green | PASS | Existing DevOps/state-machine regression gate rejects failed preview health. A green unit result is insufficient. |
| 15 | Duplicate request does not double-insert | PASS | Actual Docker/Chromium resilience duplicate case, plus restored screen evidence, `live-sandbox.json`. |
| 16 | External target refused before socket | PASS | Own-preview allowlist unit test rejects outside configuration before network invocation. No external target tool added. |
| 17 | Plaintext password and Git secret rejected | PASS | Crypto policy regression checks and real sandbox security check. Versioned policy retains one future library swap point. |
| 18 | Over-budget endpoint fails Perf | PASS | Actual Docker list endpoint measured with tiny budget produces required failure; adequate budget passes. |
| 19 | Design selection cites spec IDs | PASS | Actual APINEX Conductor/Designer proposals and stored `design_selected` event in the functional run report. This is not a completed build. |
| 20 | One-model permission review cannot merge | PASS | State-machine tests enforce distinct actual model IDs, both passing reviews and outside-spec stop. Production review still has approved-tier requirements. |
| 21 | Teacher spec, two students, isolated rows | PASS | `isolated-account.json`: real GoTrue password login, real Mongo/API and two Docker projects; peer cookie rejected. App/spec/judge contents are explicit fixtures. |
| 22 | Deadline edit rejection, snapshot/judges ZIP | PASS | Same real isolated-account/API test verifies deadline rejection and ZIP content. Judge lines are fixture evidence, not paid verdicts. |
| 23 | Export README and run command | PASS | Real snapshot ZIP includes Git repository, spec-derived README and documented run command in isolated-account test. |
| 24 | Under-18 deletion clears objects/rows, adult unaffected | PASS | Real isolated-account consent-before-storage and deletion test; adult/other student dossier remains. |
| 25 | On-prem boot has no public model call | PASS | Latest rebuilt real API image and seven Compose services; network observers loaded in API/runtime/preview and recorded no public model URL, `on-prem.json`. Account authentication is not certified by this boot test. |
| 26 | All phase 1 / 2 acceptance remains passing | FAIL | Unit/build regressions pass, but earlier live paid-frontier, existing-account native login/project, clean Windows and Mac/Linux publication gates remain incomplete. |

## Latest additional UI request

Native Welcome/Chat are retained. MrCodevaa replaces Copilot setup, Projects actions use the existing dossier API, account/preferences controls move to the title bar, and the sidebar uses the Prism M. Terminal assistance sends an explicitly selected bounded excerpt into a reviewed chat draft; it does not run commands. The optional native mode conversion that caused `variables is not iterable` is fixed in the pinned overlay.

Real installed workbench checks passed for native Chat, the bundled participant's account-required response, title-bar account/preferences, actual style/language persistence, About/palette, and real terminal selection opening a reviewable chat draft. The scripts verify the installed release ID before execution. Production website login requires deploying the existing frontend callback and API refresh route. Local signed-out and isolated GoTrue tests do not certify that deployment or the completed generated-project gates.

## Real evidence files

`artifacts/codeva-editor/` contains build logs, real installer/manifests, `installed-smoke/native.json`, `native-chat/evidence.json`, `apinex-tests.json`, `normal-chat.json`, `apinex-functional-dossier.json`, `live-sandbox.json`, `isolated-account.json`, `on-prem.json`, and unit/coverage logs. No provider key appears in these reports. Last free dossier output is **FAIL**, with `paid_frontier_acceptance_certified:false`; the older unfunded paid-provider failure is retained separately.

No push, production deployment, release publication or workflow dispatch has occurred. The canonical OS packaging commands remain in `scripts/package-ide.md`. This ledger does not change existing Codeva billing, accounts or stored chats.
