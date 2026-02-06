# Format Selection Guide

Choose the right diagram format based on your needs.

## Quick Decision Matrix

| Factor                 | Draw.io             | Mermaid              | Excalidraw     |
| ---------------------- | ------------------- | -------------------- | -------------- |
| **Learning curve**     | Low                 | Low                  | Low            |
| **Quick generation**   | Medium              | **High**             | Medium         |
| **Manual editing**     | **Excellent** (GUI) | Code-based           | Good (GUI)     |
| **Version control**    | XML (verbose)       | **Markdown** (clean) | JSON           |
| **Code documentation** | Medium              | **Excellent**        | Poor           |
| **Complex nesting**    | **Excellent**       | Poor                 | Good           |
| **Custom styling**     | **Excellent**       | Limited              | Good           |
| **Hand-drawn style**   | No                  | No                   | **Yes**        |
| **Export options**     | PDF, PNG, SVG, etc. | PNG, SVG             | PNG, SVG, JSON |

## When to Use Draw.io

### Ideal For:

- **Network topology diagrams** with nested environments/datacenters/zones
- **Complex architecture diagrams** with many layers
- **Diagrams requiring fine-grained control** over positioning and styling
- **Professional technical diagrams** for documentation
- **Diagrams that need manual refinement** after generation

### Examples:

- Enterprise network topology (environments → datacenters → zones → devices)
- Microservices architecture with many components
- System diagrams with custom icons and layouts
- Production infrastructure maps

### Strengths:

- Best-in-class nested container support (swimlanes)
- Powerful GUI editor for fine-tuning
- Export to multiple formats (PDF, PNG, SVG)
- Large library of pre-built shapes and icons
- Supports multiple pages in one file

### Weaknesses:

- XML format is verbose (larger files)
- Not ideal for quick iterations
- Manual positioning can be time-consuming

---

## When to Use Mermaid

### Ideal For:

- **Documentation embedded in code** (Markdown files)
- **Quick flowcharts and sequence diagrams**
- **Version-controlled diagrams** (clean git diffs)
- **Technical documentation** (README, API docs)
- **Simple to moderately complex diagrams**

### Examples:

- User authentication flow
- API sequence diagram
- Class diagram for a module
- ER diagram for a database
- Git workflow visualization

### Strengths:

- Text-based, easy to version control
- Can be embedded in Markdown
- Renders in GitHub, GitLab, many markdown editors
- Compact syntax
- Good support for UML diagrams (class, sequence, state, activity)

### Weaknesses:

- Limited styling options
- Poor support for complex nesting
- Layout is auto-generated (less control)
- No GUI editor (must edit code)

---

## When to Use Excalidraw

### Ideal For:

- **Hand-drawn / informal diagrams**
- **Brainstorming sessions** and mindmaps
- **Creative diagrams** with custom freeform elements
- **Informal presentations** that feel more human

### Examples:

- Whiteboard-style architecture sketches
- Meeting notes with diagrams
- Brainstorming mindmaps
- Informal process flows
- Wireframes (basic)

### Strengths:

- Unique hand-drawn aesthetic
- Freeform drawing capability
- Excellent for creative/brainstorming scenarios
- Can embed in web pages (ExcalidrawEmbed)
- Good sharing and collaboration features

### Weaknesses:

- Not ideal for precise technical diagrams
- JSON format is verbose and hard to edit manually
- Limited support for complex relationships
- Less standard in technical documentation

---

## Decision Tree

```
Start
  │
  ├─ Need hand-drawn style?
  │   └─ Yes → Excalidraw
  │   └─ No → Continue
  │
  ├─ Complex nesting (4+ levels)?
  │   └─ Yes → Draw.io
  │   └─ No → Continue
  │
  ├─ Need fine-grained positioning/styling?
  │   └─ Yes → Draw.io
  │   └─ No → Continue
  │
  ├─ Embedding in documentation/GitHub?
  │   └─ Yes → Mermaid
  │   └─ No → Continue
  │
  ├─ Quick iteration needed?
  │   └─ Yes → Mermaid
  │   └─ No → Draw.io
```

## Format Comparison by Diagram Type

| Diagram Type                  | Recommended            | Alternative                    |
| ----------------------------- | ---------------------- | ------------------------------ |
| Simple Flowchart              | **Mermaid**            | Draw.io (if styling needed)    |
| Complex Flowchart (10+ nodes) | **Draw.io**            | Mermaid (if auto-layout works) |
| Sequence Diagram              | **Mermaid**            | Draw.io                        |
| Class Diagram                 | **Mermaid**            | Draw.io                        |
| ER Diagram                    | **Mermaid**            | Draw.io                        |
| Mindmap                       | **Mermaid**            | Excalidraw (for hand-drawn)    |
| Network Topology              | **Draw.io** (required) | -                              |
| System Architecture           | **Draw.io**            | Mermaid (for high-level)       |
| Whiteboard Sketch             | **Excalidraw**         | Draw.io (formal)               |
| Brainstorming                 | **Excalidraw**         | Mermaid (structured)           |

## Migration Considerations

### Draw.io → Mermaid

- Remove nested containers (Mermaid doesn't support)
- Simplify styling
- Convert XML to Mermaid syntax
- Use auto-layout (may need manual adjustment)

### Mermaid → Draw.io

- Import or recreate manually
- Gain manual control over layout
- Add nested containers if needed

### Any Format → Excalidraw

- Recreate manually in Excalidraw editor
- Hand-drawn aesthetic adds informal feel
- Good for brainstorming iterations
