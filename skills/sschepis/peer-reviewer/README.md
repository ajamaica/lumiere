# Peer Reviewer Skill

**AI-powered academic rigor for your research.**

Peer Reviewer is an OpenClaw skill that simulates a multi-agent academic peer review process. It employs a "Council of Agents" to deconstruct arguments, find contradictions in established literature, and render a final judgment on the merit of a scientific paper or claim.

## 🧠 How It Works

The system uses three specialized AI agents:

1.  **The Deconstructor:** Parses raw text into a formal Logic Graph (Toulmin Model), extracting claims, premises, and evidence without judgment.
2.  **The Devil's Advocate:** Takes the claims and actively searches for contradictions (using Google Serper & ArXiv). It looks for theoretical conflicts, empirical contradictions, and prior art.
3.  **The Judge:** Evaluates the Logic Graph against the Devil's Advocate's objections. It scores the paper on logical coherence, foundational integrity, and empirical falsifiability.

## 🚀 Installation

```bash
npm install @sschepis/peer-reviewer
```

## 🛠️ Usage

### As a Library (Dependency Injection)

The core `PeerReviewer` class is decoupled from specific LLM or Search implementations. You can provide your own adapters or use the included ones.

```typescript
import { PeerReviewer, OpenClawLLMAdapter, SkillSearchAdapter } from '@sschepis/peer-reviewer'

// Use standard OpenClaw/Env variables (OPENAI_API_KEY, GEMINI_API_KEY)
const llm = new OpenClawLLMAdapter()

// Use the Serper CLI skill (interop)
const search = new SkillSearchAdapter('serper-tool')

const reviewer = new PeerReviewer(llm, search)
const report = await reviewer.review('My scientific claim...')
```

### Standalone CLI

You can run the reviewer directly. It will automatically detect available providers (Google Cloud, OpenAI, Serper).

```bash
# Review a file
node dist/index.js "/path/to/paper.txt"
```

## ⚙️ Configuration

The tool adapts to your environment:

- **LLM:** Checks `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `GOOGLE_APPLICATION_CREDENTIALS`.
- **Search:** Checks for `serper-tool` (CLI skill), `SERPER_API_KEY`, or falls back to `ArXiv` (free).

## License

MIT
