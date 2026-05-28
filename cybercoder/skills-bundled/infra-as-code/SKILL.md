---
name: infra-as-code
description: Author and modify Terraform, Pulumi, AWS CDK, or OpenTofu configurations. Plans diffs before applying. Always shows the blast radius.
version: 0.1.0
inputs:
  - { name: task, type: string, required: true, description: "What infra change you want (e.g. 'add a Postgres RDS', 'expose a new S3 bucket')." }
  - { name: tool, type: string, required: false, description: "terraform | pulumi | cdk | opentofu (default: detect)" }
outputs:
  - { name: result, type: string, description: Files changed + plan output + apply-or-not decision. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit, run_command]
triggers:
  - "add a database to"
  - "provision an s3 bucket"
  - "update the terraform"
license: MIT
author: cybermind
category: devops
official: true
---

# Infra as Code

You change infrastructure deliberately. You **never** run `apply` without
showing the plan and getting explicit OK. Production infrastructure is
expensive to undo.

## Methodology

1. **Detect the tool.** Look for `*.tf`, `Pulumi.yaml`, `cdk.json`,
   `*.bicep`. Match its idioms.
2. **Read the current state.** Run `terraform plan` (or
   `pulumi preview`, `cdk diff`) with **no changes yet** to confirm the
   baseline is clean.
3. **Author the change.** Use existing modules where they exist; don't
   roll a new VPC if there's a module already.
4. **Plan the change.** Run `terraform plan -out=tfplan` and **show the
   user the full diff**. Highlight any `forces replacement` or
   `# destroy` lines — those are the dangerous ones.
5. **Apply only after explicit OK.** Use the saved plan
   (`terraform apply tfplan`); don't re-plan-and-apply in one step.
6. **Record the result.** Capture outputs (resource ids, URLs) into the
   user's notes.

## Conventions

- **Resource naming:** `<project>-<env>-<resource>-<n>`, e.g.
  `cybermind-prod-rds-1`.
- **Tagging:** every resource gets `Project`, `Environment`, `Owner`,
  `ManagedBy: terraform` tags.
- **Backends:** state in a versioned, encrypted backend (S3 + DynamoDB
  lock; or Pulumi Cloud; or Terraform Cloud). Never local state for
  shared environments.
- **Secrets:** never in source. Use the provider's secret manager
  (Secrets Manager, SSM, Pulumi config secrets, etc.).
- **Modules:** if a pattern is used twice, extract it into a module.

## Hard rules

- **Never `apply` without `plan` first** — even for "tiny" changes.
- **Never** edit state directly with `terraform state rm/mv` unless you
  understand exactly what you're doing and have a backup of
  `terraform state pull`.
- **Always** show `forces replacement` lines prominently in the output.
- **No `count = 1`** when `count = var.enabled ? 1 : 0` is the actual
  intent — be explicit.

## Output

```
## Infra change: <task>

### Files
- `infra/<env>/<resource>.tf` — new/edited

### Plan summary
- N to add, M to change, K to destroy
- ⚠ Replacements: <list>

### Decision
- Plan saved to `infra/<env>/.tfplan`. Apply with:
  `terraform -chdir=infra/<env> apply .tfplan`

(Not applied automatically — user must confirm.)
```
