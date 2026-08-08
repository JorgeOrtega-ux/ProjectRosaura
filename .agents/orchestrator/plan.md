# Audit Execution Plan — Project Rosaura

## Objective
Perform a comprehensive audit of Project Rosaura codebase without modifying any codebase files, producing `docs/audit_report.md`.

## Milestones & Work Breakdown

### Phase 0: Initial Codebase Survey
- Target: Map repository structure, locate all PHP, JS, template, and configuration files, read `AI_INSTRUCTIONS.md`.
- Subagents: 2 Explorers (`teamwork_preview_explorer` / `teamwork_preview_spec_miner`).

### Milestone 1: R1 Guideline Compliance Audit
- Target: Check compliance with `AI_INSTRUCTIONS.md`.
  1. Inline CSS styles (`style="..."`).
  2. Hardcoded user-facing text or strings (missing translation keys).
  3. Fallback values in translation/config keys.
  4. Direct frontend `fetch` or `XMLHttpRequest` calls (missing `ApiService`).
  5. Native browser `alert()` or manual modal toggles.
  6. Code comments or annotations (Rule 9 violations).
- Output: `.agents/explorer_r1/r1_findings.md`

### Milestone 2: R2 Bug and Quality Analysis
- Target: Detect logical, syntax, runtime, and dead code issues in PHP/JS files.
  1. Syntax/compilation issues or error-prone constructs.
  2. Runtime exceptions (null pointer, undefined indexes/variables, unhandled promise rejections).
  3. Logical bugs and edge case handling failures.
  4. Dead, redundant, or unused code.
- Output: `.agents/explorer_r2/r2_findings.md`

### Milestone 3: R3 Configuration Mismatch Audit
- Target: Audit environment and configuration consistency.
  1. `docker-compose.yml` / Dockerfiles port mappings and service dependencies.
  2. Stripe setup (keys, webhooks, currency, endpoints).
  3. Database connection parameters (`.env`, config files, host/port/credentials).
  4. Route configurations (HTTP verbs, URL paths, middleware, handler methods).
- Output: `.agents/explorer_r3/r3_findings.md`

### Milestone 4: R4 Detailed Report Compilation & Verification
- Target: Synthesize R1, R2, and R3 findings into `docs/audit_report.md`.
- Verification: Reviewer & Forensic Auditor verify structure, line numbers, recommendations, and confirm codebase remains clean/untouched.

## Verification & Acceptance Criteria
- File `docs/audit_report.md` exists and is formatted correctly.
- Three major sections:
  1. Guideline Compliance Violations
  2. Logical & Runtime Bugs
  3. Configuration Inconsistencies
- Every item has: File path, Line number, Problem description, Concrete recommendation.
- Code repository files remain untouched.
