# PARA Decision Guide

## Decision Tree

- Completed/inactive? → Archives
- Has deadline/end state? → Projects
- Ongoing responsibility? → Areas
- Reference material? → Resources

## Category Examples

### Projects (Time-bound)

- "Launch website by Q2", "Write paper for May conference", "Job hunt 2025"
- NOT: "Career development" (Area), "Python notes" (Resource)

### Areas (Ongoing)

- "Health & fitness", "Business operations", "Product development", "Home maintenance"
- NOT: "Get promoted" (Project), "Coding standards" (Resource)

### Resources (Reference)

- "Coding standards", "Design patterns", "Resume templates", "Platform configs"
- NOT: "Update standards" (Project), "Maintain design system" (Area)

### Archives (Inactive)

- Completed projects, old engagements, deprecated docs

## Common Scenarios

**Consulting**: Technical work → `projects/active/client-x.md` | Relationship → `areas/consulting/clients/client-x.md`

**Research**: Active experiments → `areas/research/` | Specific deadline → `projects/active/` | Published → `resources/`

**Job hunt**: Active applications → `projects/active/job-hunt-2025.md` | Stories → `projects/stories/` | Templates → `resources/career-materials/`

**Learning tech**: For project → include in project | General skill → `areas/professional-development/` | Reference → `resources/`

**Business (LLC)**: Ongoing ops → `areas/business-name/` | Specific goal → `projects/active/`

## Edge Cases

- **Project → Area**: "Build KB" completes → create `areas/knowledge-management/`
- **Split large Areas**: Single file growing → convert to directory with `_overview.md`
- **Tiny tasks** (<1 week): May not need formal project tracking

## When Unsure

Ask: Deadline? → Projects | Ongoing? → Areas | Reference? → Resources | Inactive? → Archives

Default: Put in Resources temporarily, move later as clarity emerges.
