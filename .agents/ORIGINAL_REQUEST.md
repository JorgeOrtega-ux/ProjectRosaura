# Original User Request

## 2026-08-08T03:27:14Z

An in-depth codebase audit of Project Rosaura to detect style guide violations, logical/runtime bugs, configuration discrepancies, and code quality issues.

Working directory: f:\htdocs\ProjectRosaura
Integrity mode: development

## Requirements

### R1. Guideline Compliance Audit (AI_INSTRUCTIONS.md)
Scan all files (PHP, JS, templates) to detect deviations from the rules in [AI_INSTRUCTIONS.md](file:///f:/htdocs/ProjectRosaura/AI_INSTRUCTIONS.md), including:
- Usage of inline CSS styles (`style="..."` attributes).
- Hardcoded user-facing text or strings (must use translation keys).
- Fallback values in translation/config keys.
- Direct frontend `fetch` or `XMLHttpRequest` calls (must use `ApiService`).
- Native browser `alert()` or manual modal toggles (must use modal system).
- Explanatory comments or code annotations (Rule 9 of AI_INSTRUCTIONS.md prohibits comments).

### R2. Bug and Quality Analysis
Scan codebase files for syntax/compilation issues, possible runtime exceptions, logical bugs, and dead or redundant code in JS/PHP files.

### R3. Configuration Mismatch Audit
Inspect docker-compose, stripe setup, database connection parameters, and route configurations to identify port, environment variable, or endpoint inconsistencies.

### R4. Detailed Report Output
Compile all findings into a structured Markdown document saved to `docs/audit_report.md`.

## Acceptance Criteria

### Execution & Output
- [ ] An audit report is successfully created and saved to [audit_report.md](file:///f:/htdocs/ProjectRosaura/docs/audit_report.md).
- [ ] The report categorizes findings by type: "Guideline Compliance Violations", "Logical & Runtime Bugs", and "Configuration Inconsistencies".
- [ ] For each issue, the report specifies the file path, line number, problem description, and concrete recommendation for how to fix it.
- [ ] The code files in the repository themselves must remain untouched or clean of any added comments/annotations (adhering strictly to Rule 9 of AI_INSTRUCTIONS.md).
