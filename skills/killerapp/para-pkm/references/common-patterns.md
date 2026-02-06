# Common PARA Patterns

## By Persona

### Software Developers

- `projects/active/` → features, bugs, migrations with deadlines
- `areas/professional-development/` → skill building, open-source
- `resources/coding-standards/`, `platform-configs/`, `library-preferences/`

### Consultants

- `projects/active/client-x.md` → technical deliverables
- `areas/consulting/operations/` → invoicing, onboarding, CRM
- `areas/consulting/clients/` → relationship notes
- `resources/proposal-templates/`, `contract-templates/`
- Key: Dual tracking (technical in Projects, relationship in Areas)

### Researchers

- `projects/active/` → papers, grants with deadlines
- `areas/teaching/`, `areas/research-program/experiments/`
- `resources/literature-review/`, `methodologies/`

### Product Builders

- `projects/active/` → feature launches, partnerships
- `areas/product-development/active/` → shipping products
- `areas/product-development/research/` → experiments
- `areas/product-development/graduated/` → ready to ship
- `resources/market-research/`, `user-feedback/`

### Career Professionals

- `projects/active/job-hunt-2025.md` → time-bound goal
- `projects/stories/` → full narratives + `fragments/` for atomic pieces
- `areas/career-development/` → ongoing skill building
- `resources/career-materials/` → templates

### Multi-Role

- Don't separate by role (no `work/` vs `consulting/`)
- Organize by actionability across all roles
- Single `projects/active/` with items from any role

## Cross-Cutting Patterns

**Nested Areas**: `areas/business/` with `_overview.md`, `operations/`, `clients/` (max 2-3 levels, nest when >10 files)

**Project Stories**: `projects/stories/` with full narratives + `fragments/` for remixable atomic pieces + `_index.md`

**Research Pipeline**: `areas/research/category/experiment.md` organized by domain → `graduated/` when ready

**AI Navigation**: Root `AGENTS.md` <100 lines, minimal tokens, points to paths for grep/glob

**Graduated Content**: Research → Graduated → Active (or Ideas → Drafts → Graduated for content)

## Guidelines

1. Start simple with basic P/A/R/A
2. Let patterns emerge, don't over-organize
3. Copy proven patterns as templates
4. Adapt as needed; patterns serve you
5. Review and reorganize periodically
