# TreeListy Pattern Reference

Complete reference for all 21 TreeListy patterns. Each pattern provides:

- **4-level hierarchy** with domain-specific naming
- **Custom fields** relevant to the domain
- **Type classifications** for categorizing nodes
- **Phase templates** for common breakdowns

---

## 📋 generic — Generic Project

**Use for:** General projects, default structure, anything that doesn't fit another pattern.

**Levels:** Project → Phase → Item → Task

**Phase Templates:** Pre-Seed, Seed, Build

**Types:** Land, Engineering, Equipment, Infrastructure, Corporate, Professional, Contingency

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| cost | number | Budget allocated for this item |
| alternateSource | text | Backup vendor or alternative solution |
| leadTime | text | Procurement/delivery timeline |

---

## 💼 sales — Sales Pipeline

**Use for:** Sales tracking, deal management, quarterly pipelines.

**Levels:** Pipeline → Quarter → Deal → Action

**Phase Templates:** Q1, Q2, Q3, Q4

**Types:** Inbound Lead, Outbound Prospect, Partnership, Account Expansion, Renewal, Upsell, Cross-sell, Enterprise Deal

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| dealValue | number | Potential revenue |
| expectedCloseDate | date | Target close date |
| leadSource | text | Lead origin |
| contactPerson | text | Main decision maker |
| stageProbability | number | Likelihood of closing (0-100) |
| competitorInfo | textarea | Other vendors |

---

## 🎓 thesis — Academic Writing

**Use for:** Dissertations, academic papers, research documents.

**Levels:** Thesis → Chapter → Section → Point

**Phase Templates:** Introduction, Body, Conclusion

**Types:** Literature Review, Methodology, Analysis, Discussion, Theory, Evidence, Argument, Conclusion

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| wordCount | number | Current word count |
| targetWordCount | number | Goal word count |
| draftStatus | select | Outline / First Draft / Revision / Final |
| citations | textarea | Key sources |
| keyArgument | textarea | Central claim |
| evidenceType | select | Empirical / Theoretical / Mixed / N/A |

---

## 🚀 roadmap — Product Roadmap

**Use for:** Product planning, feature roadmaps, sprint organization.

**Levels:** Product → Quarter → Feature → Story

**Phase Templates:** Q1, Q2, Q3, Q4

**Types:** Core Feature, Enhancement, Bug Fix, Technical Debt, Research/Spike, Platform, Integration, UX Improvement

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| storyPoints | number | Effort estimate (Fibonacci) |
| engineeringEstimate | text | Time estimate |
| userImpact | select | High / Medium / Low |
| technicalRisk | select | Low / Medium / High / Unknown |
| featureFlag | text | Flag for gradual rollout |

---

## 📚 book — Book Writing

**Use for:** Novels, non-fiction books, screenplays.

**Levels:** Book → Part → Chapter → Scene

**Phase Templates:** Act I, Act II, Act III

**Types:** Narrative, Dialogue, Description, Action, Reflection, Transition, Climax, Exposition

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| wordCount | number | Current word count |
| targetWordCount | number | Goal word count |
| draftStatus | select | Outline / First Draft / Revision / Final |
| povCharacter | text | Point-of-view character |
| sceneSetting | textarea | Location, time, mood |
| plotFunction | select | Setup / Conflict / Resolution / Transition |

---

## 🎉 event — Event Planning

**Use for:** Conferences, parties, corporate events, weddings.

**Levels:** Event → Stage → Activity → Task

**Phase Templates:** Pre-Event, Event Day, Post-Event

**Types:** Logistics, Catering, Entertainment, Venue, Marketing, Registration, Follow-up, AV/Tech

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| budget | number | Budget for activity |
| vendor | text | External vendor |
| bookingDeadline | date | Last date to book |
| guestCount | number | Expected attendees |
| location | text | Venue location |
| responsiblePerson | text | Team member |

---

## 💪 fitness — Fitness Program

**Use for:** Training programs, workout plans, athletic periodization.

**Levels:** Program → Phase → Workout → Exercise

**Phase Templates:** Foundation, Build, Peak

**Types:** Strength Training, Cardio, Flexibility, Recovery, Nutrition, Assessment, Conditioning, Mobility

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| sets | number | Number of sets |
| reps | text | Repetitions per set |
| duration | text | Time for exercise |
| intensity | select | Light / Moderate / High / Max |
| equipment | text | Required equipment |
| formCues | textarea | Technique reminders |
| restPeriod | text | Rest between sets |

---

## 📊 strategy — Strategic Plan

**Use for:** Business strategy, OKRs, strategic initiatives.

**Levels:** Strategy → Pillar → Initiative → Action

**Phase Templates:** Planning, Execution, Review

**Types:** Market Expansion, Operational Excellence, Financial, HR, Technology, Risk Management, Innovation, Customer Experience

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| investment | number | Capital investment |
| keyMetric | text | Success measurement |
| targetValue | text | Goal to achieve |
| responsibleExecutive | text | Executive sponsor |
| strategicTheme | select | Growth / Efficiency / Innovation / Transformation / Risk Mitigation |
| riskLevel | select | Low / Medium / High |

---

## 📖 course — Course Design

**Use for:** Educational curricula, training programs, lesson planning.

**Levels:** Course → Unit → Lesson → Exercise

**Phase Templates:** Beginning, Middle, Advanced

**Types:** Lecture, Lab/Practical, Discussion, Assessment, Reading, Project, Workshop, Field Work

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| learningObjectives | textarea | Expected outcomes |
| duration | text | Class time needed |
| difficultyLevel | select | Beginner / Intermediate / Advanced |
| prerequisites | textarea | Prior knowledge |
| assessmentType | select | Quiz / Assignment / Project / Discussion / Exam / None |
| resourcesNeeded | textarea | Required materials |
| homework | textarea | Out-of-class work |

---

## 🎬 film — AI Video Production

**Use for:** AI video projects using Sora, Veo, Runway, Pika, etc.

**Levels:** Film → Act → Scene → Shot

**Phase Templates:** Act I - Setup, Act II - Conflict, Act III - Resolution

**Types:** Establishing Shot, Character Introduction, Dialogue Scene, Action Sequence, Montage, Transition, Climax, Resolution

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| aiPlatform | select | Sora / Veo 3 / Runway Gen-3 / Pika 2.0 / Kling AI / Luma / Haiper |
| videoPrompt | textarea | Text-to-video prompt |
| visualStyle | select | Photorealistic / Cinematic / Documentary / Anime / Pixar 3D / Noir |
| duration | select | 2s / 4s / 6s / 10s / 20s / Extended |
| aspectRatio | select | 16:9 / 9:16 / 1:1 / 2.39:1 / 4:3 |
| cameraMovement | select | Static / Pan / Dolly / Tracking / Crane / Handheld / Orbiting |
| motionIntensity | select | Minimal / Subtle / Moderate / Dynamic / Intense |
| lightingMood | select | Golden Hour / Overcast / Night / Neon / Dramatic / Studio |
| iterationNotes | textarea | Generation insights |

---

## 🤔 philosophy — Philosophy

**Use for:** Philosophical arguments, Socratic dialogues, treatises.

**Levels:** Dialogue → Movement → Claim → Support

**Phase Templates:** Opening Question, First Definition, Refutation, Second Attempt, Deeper Inquiry, Resolution

**Types:** Question, Definition, Refutation/Elenchus, Premise, Conclusion, Objection, Response, Example, Analogy, Distinction, Paradox, Thought Experiment, Aporia

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| speaker | text | Who makes this claim |
| argumentType | select | Deductive / Inductive / Abductive / Dialectical / Reductio / Socratic Elenchus |
| validity | select | Valid / Invalid / Sound / Unsound / Uncertain |
| keyTerms | text | Central concepts |
| premise1 | textarea | First premise |
| premise2 | textarea | Second premise |
| conclusion | textarea | Logical conclusion |
| objection | textarea | Main counterargument |
| response | textarea | Defense/reply |
| textualReference | text | Stephanus number or citation |
| philosophicalSchool | select | Pre-Socratic / Platonic / Aristotelian / Stoic / Epicurean / Skeptic / Neoplatonic / Medieval / Modern / Contemporary |

---

## 🧠 prompting — Prompt Engineering

**Use for:** Prompt libraries, AI instruction design, prompt testing.

**Levels:** Prompt Library → Category → Prompt → Test Case

**Phase Templates:** Customer Support, Content Generation, Data Analysis, Code Assistance, Research, Creative Writing

**Types:** Task Instruction, Few-Shot Examples, Chain-of-Thought, Structured Output, XML-Guided, Prefill-Guided, Production-Ready, Experimental

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| systemPrompt | textarea | AI role and behavior (required) |
| userPromptTemplate | textarea | Main instruction (required) |
| fewShotExamples | textarea | 2-3 examples |
| outputFormat | textarea | Expected structure |
| chainOfThought | textarea | Step-by-step reasoning |
| modelTarget | select | Claude 3.5 Sonnet / Claude 3 Opus / GPT-4o / GPT-4 Turbo / Gemini Pro |
| temperature | number | Creativity level (0-1) |
| testResults | textarea | Performance metrics |
| testStatus | select | Draft / Testing / Validated / Production / Deprecated |

---

## 👨‍👩‍👧‍👦 familytree — Family Tree

**Use for:** Genealogy, family history documentation.

**Levels:** Family → Generation → Person → Event

**Phase Templates:** Self/Siblings, Parents, Grandparents, Great-Grandparents

**Types:** Paternal Line, Maternal Line, Spouse, Biological, Adopted, Step-Family, Foster, Half-Sibling

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| fullName | text | Complete name |
| maidenName | text | Birth surname |
| gender | select | Male / Female / Other / Unknown |
| birthDate | date | Date of birth |
| birthPlace | text | City, state, country |
| livingStatus | select | Living / Deceased / Unknown |
| deathDate | date | Date of death |
| deathPlace | text | Place of death |
| marriageDate | date | Marriage date |
| spouseName | text | Spouse name |
| occupation | text | Career |
| photoURL | text | Photo link |
| dnaInfo | textarea | DNA test results |
| sources | textarea | Documents, certificates |

---

## 💬 dialogue — Dialogue & Rhetoric

**Use for:** Debate analysis, conversation mapping, rhetoric study.

**Levels:** Conversation → Speaker → Statement → Point

**Phase Templates:** Speaker A, Speaker B, Speaker C, Moderator

**Types:** Logical Argument, Emotional Appeal (Pathos), Ethical Appeal (Ethos), Statistical Evidence, Anecdotal Evidence, Rhetorical Question, Counterargument, Deflection/Dodge, Concession/Agreement

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| speaker | text | Who is making this statement |
| verbatimQuote | textarea | Exact words |
| rhetoricalDevice | select | Logos / Pathos / Ethos / Kairos / Metaphor / Anaphora / Rhetorical Question |
| logicalStructure | textarea | Premises and conclusion |
| fallaciesPresent | textarea | Logical fallacies |
| hiddenMotivation | textarea | Unstated goals |
| emotionalTone | select | Calm / Passionate / Angry / Defensive / Confident / Hesitant / Sarcastic |
| counterargument | textarea | Strongest rebuttal |
| evidenceQuality | select | Strong / Moderate / Weak / None / Misleading |
| effectivenessRating | number | Persuasiveness (1-10) |

---

## 💾 filesystem — File System

**Use for:** File organization, folder structure planning, drive mapping.

**Levels:** Drive → Folder → File/Folder → File

**Phase Templates:** Documents, Downloads, Desktop, Pictures, Videos, Projects

**Types:** Folder, PDF, Word Doc, Spreadsheet, Presentation, Text File, Image, Video, Audio, Code, Archive, Executable

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| fileSize | number | Size in bytes |
| fileExtension | text | File type |
| filePath | text | Complete path |
| dateModified | datetime | Last modification |
| fileOwner | text | Owner email |
| permissions | select | Read Only / Read/Write / Owner / Admin |
| driveType | select | Local / Google Drive / OneDrive / Dropbox / iCloud / S3 |
| isFolder | checkbox | Is this a folder |

_Note: This pattern supports flexible depth (unlimited nesting)._

---

## 📧 gmail — Email Workflow

**Use for:** Email campaign planning, inbox organization, email analysis.

**Levels:** Inbox/Campaign → Label/Stage → Thread → Message

**Phase Templates:** Inbox, Sent, Important, Archive

**Types:** Cold Outreach, Newsletter, Response, Follow-up, Internal Update, Transactional

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| recipientEmail | text | Primary recipient |
| subjectLine | text | Email subject |
| emailBody | textarea | Main content |
| sendDate | date | When sent/received |
| status | select | Draft / Ready / Sent / Replied / Archived |
| threadId | text | Gmail thread ID |
| messageCount | number | Messages in thread |

---

## 📚 knowledge-base — Knowledge Base

**Use for:** Document corpora, RAG preparation, knowledge management.

**Levels:** Knowledge Base → Source → Section → Chunk

**Phase Templates:** Documents, Web Pages, Notes, Research

**Types:** PDF Document, Web Page, Plain Text, Markdown, Personal Note, Research Paper, Article, Transcript

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| sourceUrl | text | Original source |
| sourceType | select | PDF / Web Page / Plain Text / Markdown / Note / Paper |
| importDate | date | When imported |
| author | text | Content author |
| wordCount | number | Total words |
| chunkIndex | number | Position in document |
| relevanceScore | number | How relevant (0-100) |
| tags | text | Keywords |

---

## 💰 capex — CAPEX / Angel Pitch

**Use for:** Capital expenditure planning, investor pitch decks, fundraising structures.

**Levels:** Project → Funding Phase → Investment → Deliverable

**Phase Templates:** Seed, Series A, Series B

**Types:** Equipment, Infrastructure, Validation, Development, Milestone, Risk Mitigation, Working Capital, Personnel

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| cost | number | Capital expenditure |
| risk | text | Primary risk |
| mitigation | text | Risk mitigation strategy |
| valuationImpact | text | How this affects valuation |
| leadTime | text | Time to complete |

---

## 🎙️ freespeech — Free Speech

**Use for:** Voice transcription analysis, stream-of-consciousness capture, psychological pattern detection.

**Levels:** Session → Theme → Pattern → Evidence

**Phase Templates:** Surface Themes, Hidden Patterns, Contradictions, Silences, Recurring Structures

**Types:** Repetition, Emotional Weight, Contradiction, Avoidance, Implicit Belief, Named Entity, Sentence Structure

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| frequency | number | Times pattern appeared |
| emotionalIntensity | select | Low / Medium / High / Peak |
| quotedText | textarea | Verbatim speech |
| insight | textarea | Psychological interpretation |

---

## 🌳 lifetree — LifeTree

**Use for:** Biographical timelines, life stories, memoir planning.

**Levels:** Life → Decade → Event → Detail

**Phase Templates:** Auto-generated from birth year

**Types:** Birth, Family, Education, Career, Relationship, Residence/Move, Health, Milestone, Loss, Travel, Achievement, Memory/Story

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| eventDate | text | Natural language date |
| age | number | Auto-calculated |
| location | text | Event location |
| people | text | People involved |
| emotion | select | Joyful / Proud / Bittersweet / Difficult / Routine / Milestone |
| source | text | Who contributed memory |
| confidence | select | Exact / Approximate / Family legend |
| mediaUrl | text | Photo/document link |

_Special: Requires birth year, supports death year, auto-generates decade phases._

---

## ✏️ custom — Custom Names

**Use for:** When none of the above fit. Define your own level names.

**Levels:** Level 0 → Level 1 → Level 2 → Level 3 (customizable)

**Phase Templates:** None (user-defined)

**Types:** None (user-defined)

**Fields:** None (user-defined)

---

## Pattern Selection Guide

| If you're doing...           | Use this pattern        |
| ---------------------------- | ----------------------- |
| General project planning     | `generic`               |
| Product feature planning     | `roadmap`               |
| Sales tracking               | `sales`                 |
| Writing a book or screenplay | `book`                  |
| Academic paper               | `thesis`                |
| Event/conference planning    | `event`                 |
| Business strategy            | `strategy`              |
| Training/lesson planning     | `course`                |
| AI video production          | `film`, `veo3`, `sora2` |
| Philosophical analysis       | `philosophy`            |
| Prompt library management    | `prompting`             |
| Family history               | `familytree`            |
| Debate/rhetoric analysis     | `dialogue`              |
| File organization            | `filesystem`            |
| Email workflows              | `gmail`                 |
| Knowledge base / RAG         | `knowledge-base`        |
| Fundraising / CapEx          | `capex`                 |
| Voice pattern analysis       | `freespeech`            |
| Life story / biography       | `lifetree`              |
| Something unique             | `custom`                |
