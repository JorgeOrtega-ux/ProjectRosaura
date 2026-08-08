# Project: Rosaura Codebase Audit

## Architecture
- Root Directory: `f:\htdocs\ProjectRosaura`
- Core Task: Read-only deep analysis of codebase and documentation against AI rules, quality standards, and configuration specs.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Guideline Compliance (R1) | Inline CSS, hardcoded text, translation fallbacks, direct fetch, alerts, code comments | M1 | ORIGINAL_REQUEST.md |
| 2 | Bug & Quality Analysis (R2) | Syntax issues, runtime exceptions, logical bugs, dead code | M2 | ORIGINAL_REQUEST.md |
| 3 | Config Mismatch Audit (R3) | Docker ports, Stripe setup, DB parameters, route configs | M3 | ORIGINAL_REQUEST.md |
| 4 | Audit Report Compilation (R4)| Synthesize findings into `docs/audit_report.md` | M4 | ORIGINAL_REQUEST.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Survey Phase | Map repo files and read AI_INSTRUCTIONS.md | none | IN_PROGRESS |
| 2 | Milestone 1 (R1) | Guideline Compliance Audit | M1 | PLANNED |
| 3 | Milestone 2 (R2) | Bug and Quality Analysis | M1 | PLANNED |
| 4 | Milestone 3 (R3) | Configuration Mismatch Audit | M1 | PLANNED |
| 5 | Milestone 4 (R4) | Generate docs/audit_report.md & Verify | M2, M3, M4 | PLANNED |

## Code Layout
- Target Audit Report: `docs/audit_report.md`
- Metadata Workspace: `.agents/`
