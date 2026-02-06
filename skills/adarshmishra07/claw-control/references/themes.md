# Agent Team Themes

## 🎯 UNLIMITED THEMES

**Users can pick ANY series, movie, anime, cartoon, game, or book!**

The themes below are just EXAMPLES. When a user names any franchise:

1. Pick 6 iconic characters that fit the agent roles
2. Match character personalities to roles:
   - **Coordinator** → Leader, protagonist, decision-maker
   - **Backend** → Strong supporter, handles heavy work
   - **DevOps** → Technical/operations specialist
   - **Research** → Smart, analytical, knowledge-focused
   - **Architecture** → Strategic, big-picture thinker
   - **Deployment** → Quick, reliable, handles pressure
3. Generate the AGENT_MAPPING with IDs 1-6
4. Confirm with the user

---

## Example Themes

Character mappings for popular TV series/franchises.

## Dragon Ball Z 🐉

| Role         | Character | Description                        |
| ------------ | --------- | ---------------------------------- |
| Coordinator  | Goku      | Main protagonist, leads with heart |
| Backend      | Vegeta    | Prince of Saiyans, intense focus   |
| DevOps       | Bulma     | Tech genius, builds everything     |
| Research     | Gohan     | Scholar, analytical mind           |
| Architecture | Piccolo   | Strategic, big-picture thinking    |
| Deployment   | Trunks    | Time-traveler, handles urgency     |

```javascript
const AGENT_MAPPING = {
  Goku: 1,
  Vegeta: 2,
  Bulma: 3,
  Gohan: 4,
  Piccolo: 5,
  Trunks: 6,
}
```

## One Piece ☠️

| Role         | Character | Description                       |
| ------------ | --------- | --------------------------------- |
| Coordinator  | Luffy     | Captain, simple but determined    |
| Backend      | Zoro      | First mate, handles heavy lifting |
| DevOps       | Nami      | Navigator, manages resources      |
| Research     | Robin     | Archaeologist, deep knowledge     |
| Architecture | Franky    | Shipwright, builds systems        |
| Deployment   | Sanji     | Cook, delivers under pressure     |

```javascript
const AGENT_MAPPING = {
  Luffy: 1,
  Zoro: 2,
  Nami: 3,
  Robin: 4,
  Franky: 5,
  Sanji: 6,
}
```

## Marvel 🦸

| Role         | Character | Description                    |
| ------------ | --------- | ------------------------------ |
| Coordinator  | Tony      | Iron Man, orchestrates         |
| Backend      | Steve     | Captain America, reliable core |
| DevOps       | Natasha   | Black Widow, ops specialist    |
| Research     | Bruce     | Hulk/Banner, analytical        |
| Architecture | Thor      | God of Thunder, big picture    |
| Deployment   | Peter     | Spider-Man, quick deploys      |

```javascript
const AGENT_MAPPING = {
  Tony: 1,
  Steve: 2,
  Natasha: 3,
  Bruce: 4,
  Thor: 5,
  Peter: 6,
}
```

## Friends 🎬

| Role         | Character | Description               |
| ------------ | --------- | ------------------------- |
| Coordinator  | Ross      | Paleontologist, organizes |
| Backend      | Chandler  | IT guy, handles systems   |
| DevOps       | Monica    | Chef, operations queen    |
| Research     | Rachel    | Fashion, user research    |
| Architecture | Joey      | Actor, creative solutions |
| Deployment   | Phoebe    | Musician, unconventional  |

```javascript
const AGENT_MAPPING = {
  Ross: 1,
  Chandler: 2,
  Monica: 3,
  Rachel: 4,
  Joey: 5,
  Phoebe: 6,
}
```

## Suits 👔

| Role         | Character | Description                   |
| ------------ | --------- | ----------------------------- |
| Coordinator  | Harvey    | Senior partner, closer        |
| Backend      | Mike      | Associate, does the work      |
| DevOps       | Donna     | Executive assistant, runs ops |
| Research     | Louis     | Junior partner, thorough      |
| Architecture | Jessica   | Managing partner, strategy    |
| Deployment   | Rachel    | Paralegal, execution          |

```javascript
const AGENT_MAPPING = {
  Harvey: 1,
  Mike: 2,
  Donna: 3,
  Louis: 4,
  Jessica: 5,
  Rachel: 6,
}
```

## Breaking Bad 🧪

| Role         | Character | Description                         |
| ------------ | --------- | ----------------------------------- |
| Coordinator  | Walter    | Chemistry teacher turned mastermind |
| Backend      | Jesse     | Partner, handles execution          |
| DevOps       | Mike      | Fixer, operations                   |
| Research     | Gale      | Lab assistant, research             |
| Architecture | Gus       | Distribution, big picture           |
| Deployment   | Saul      | Lawyer, quick solutions             |

```javascript
const AGENT_MAPPING = {
  Walter: 1,
  Jesse: 2,
  Mike: 3,
  Gale: 4,
  Gus: 5,
  Saul: 6,
}
```

## The Office 📎

| Role         | Character | Description                         |
| ------------ | --------- | ----------------------------------- |
| Coordinator  | Michael   | Regional manager                    |
| Backend      | Dwight    | Assistant (to the) regional manager |
| DevOps       | Jim       | Sales, smooth operator              |
| Research     | Oscar     | Accountant, analytical              |
| Architecture | Andy      | Cornell grad, planning              |
| Deployment   | Stanley   | Sales, gets it done                 |

```javascript
const AGENT_MAPPING = {
  Michael: 1,
  Dwight: 2,
  Jim: 3,
  Oscar: 4,
  Andy: 5,
  Stanley: 6,
}
```

## Star Wars ⭐

| Role         | Character | Description             |
| ------------ | --------- | ----------------------- |
| Coordinator  | Luke      | Jedi, leads the team    |
| Backend      | Han       | Smuggler, heavy lifting |
| DevOps       | Leia      | Princess, operations    |
| Research     | Obi-Wan   | Master, wisdom          |
| Architecture | Yoda      | Grand master, strategy  |
| Deployment   | Chewie    | Co-pilot, reliable      |

```javascript
const AGENT_MAPPING = {
  Luke: 1,
  Han: 2,
  Leia: 3,
  'Obi-Wan': 4,
  Yoda: 5,
  Chewie: 6,
}
```

## Harry Potter 🧙

| Role         | Character  | Description           |
| ------------ | ---------- | --------------------- |
| Coordinator  | Harry      | The chosen one        |
| Backend      | Ron        | Best friend, support  |
| DevOps       | Hermione   | Brightest witch, ops  |
| Research     | Luna       | Ravenclaw, research   |
| Architecture | Dumbledore | Headmaster, strategy  |
| Deployment   | Neville    | Gryffindor, execution |

```javascript
const AGENT_MAPPING = {
  Harry: 1,
  Ron: 2,
  Hermione: 3,
  Luna: 4,
  Dumbledore: 5,
  Neville: 6,
}
```

## Custom Theme

For custom themes, ask the user for:

1. Series/franchise name
2. 6 character names
3. Which character is the coordinator

Then generate the mapping accordingly.
