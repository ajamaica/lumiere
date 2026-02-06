# Antigravity Sub-Agents Skill 🚀

**AI 에이전트 팀을 고용하여 코딩 작업을 맡겨보세요.**

이 스킬은 Antigravity IDE 환경 내에서 여러 명의 전문 AI 에이전트(Sub-Agents)를 생성하여 복잡한 작업을 병렬로 처리할 수 있게 해줍니다. 터미널을 사용하든 Antigravity IDE를 사용하든, Architect, Engineer, Validator로 구성된 팀이 여러분의 문제를 효율적으로 해결해 드립니다.

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   ✨ Antigravity Swarm Mission Control ✨                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
╭──────────────────┬───────────┬─────────────┬──────╮╭───── Live Activity ─────╮
│ Agent            │ Role      │   Status    │ Time ││                         │
├──────────────────┼───────────┼─────────────┼──────┤│                         │
│ Prometheus       │ serial    │ ✔ Completed │ 32s  ││                         │
│ Junior           │ serial    │ 🔄 Running  │ 15s  ││ Agent: Junior           │
│ Quality_Validat… │ validator │ ⏳ Pending  │ -    ││ Action: Implementing    │
╰──────────────────┴───────────┴─────────────┴──────╯│ core logic...           │
                                                     │                         │
                                                     ╰─────────────────────────╯
```

> [!IMPORTANT] > **왜 이 스킬이 필요한가요?**
> 2026년 1월 31일 기준, Gemini CLI나 Antigravity IDE에는 서브에이전트를 배포할 수 있는 **네이티브 기능이 존재하지 않습니다.**
> 이 스킬은 그 공백을 메워, 여러분의 개발 환경에서 진정한 병렬 에이전트 오케스트레이션을 가능하게 합니다.

> [!NOTE] > **Windows 호환성 (Windows Compatibility)**
> 이 스킬은 Windows PowerShell 환경(CP949/한국어 로케일)을 완벽하게 지원합니다. 모든 입출력 작업에 UTF-8 인코딩을 강제하여 인코딩 오류를 방지했습니다.

> [!WARNING]
> **Orchestrator가 실행 중일 때 이 디렉토리의 파일을 수정하지 마십시오.**
> 시스템은 `task_plan.md`, `findings.md`, `subagents.yaml` 파일을 실시간으로 읽고 씁니다.
> 실행 중에 수동으로 파일을 편집하면 경합 조건(Race Condition)이나 에이전트의 오작동을 유발할 수 있습니다.

> [!NOTE]
> **상태 파일 관리 (State Files Management)**
> 대규모 미션을 시작하면 시스템은 프로젝트 루트에 `task_plan.md`, `findings.md`, `progress.md` 파일을 자동으로 생성합니다.
> 이 파일들은 에이전트 스웜(Swarm)의 "공유 메모리" 역할을 합니다. 미션이 진행되는 동안에는 이 파일들을 삭제하지 마십시오.

---

## 왜 이 스킬을 사용해야 하나요?

- **병렬 처리 (Parallel Execution)**: 한 명의 에이전트가 끝날 때까지 기다릴 필요가 없습니다. 3명의 에이전트를 동시에 실행하세요 (예: 한 명은 문서 작성, 한 명은 테스트 작성, 한 명은 코드 작성).
- **전문성 (Specialization)**: 각 에이전트에게 서로 다른 "페르소나"(프롬프트)를 부여하여 전문적인 작업을 수행하게 합니다.
- **품질 보증 (Quality Assurance)**: **[NEW]** 모든 팀에는 **Validator Agent(검증가)**가 필수적으로 포함되어, 작업 완료 전 결과물을 검토하고 높은 품질을 보장합니다.

---

## 설치 방법 (Installation)

1.  **스킬 위치 확인**: 이 리포지토리가 skills 폴더 안에 있는지 확인하세요:
    ```bash
    ~/.gemini/skills/antigravity-swarm/
    ```
2.  **의존성 패키지 설치**:

    ```bash
    pip install -r requirements.txt
    ```

    _(Requires `rich`, `pyyaml`, etc.)_

3.  **Gemini CLI**: `gemini` 명령어가 설치되어 있고 PATH에 등록되어 있어야 합니다.

---

## 사용 가이드 (User Manual)

이 스킬을 활용하는 세 가지 주요 방법이 있습니다.

### 🅰️ 시나리오 A: Gemini CLI (수동 모드)

터미널에서 직접 팀을 "고용"하여 작업을 맡기고 싶을 때 사용하세요.

**Step 1: 팀 고용 (Plan)**
미션 내용을 입력하여 플래너(Planner)를 실행합니다.

```bash
python3 scripts/planner.py "뱀 게임을 만들어줘. 배경은 초록색이고 점수 기록 기능이 있어야 해."
```

**Step 2: 계획 검토 (Review)**
Planner는 **가용 에이전트 풀** (하단 참조)에서 최적의 팀을 제안하고 `task_plan.md` 초안을 작성합니다.

**Step 3: 실행 (Orchestrate)**
승인 후, 팀을 출동시킵니다:

```bash
python3 scripts/orchestrator.py
```

### 🅱️ 시나리오 B: Ultrawork Loop (자율 모드)

"설정하고 잊어버리는(set and forget)" 작업을 위해 사용하세요. 시스템은 미션이 성공할 때까지 **계획(Plan) -> 실행(Act) -> 검증(Verify) -> 수정(Fix)** 루프를 자동으로 반복합니다.

```bash
python3 scripts/ultrawork_loop.py "인증 모듈을 리팩토링하고 테스트 코드를 추가해줘"
```

### 🆎 시나리오 C: Antigravity IDE (에이전트 통합)

IDE에서 `~/.gemini/GEMINI.md`에 이 스킬이 통합되어 있다면, 메인 에이전트는 복잡한 작업에 대해 **자동으로** 이 스킬을 호출합니다.

---

## 가용 에이전트 역할 (Oh-My-Opencode 표준)

Planner는 다음 전문가 풀에서 미션에 가장 적합한 에이전트를 자동으로 선발합니다:

| 역할 (Role)           | 전문 분야 (Expertise)                 | 모델 (Model)   |
| --------------------- | ------------------------------------- | -------------- |
| **Oracle**            | 아키텍처, 심층 디버깅, 근본 원인 분석 | gemini-3-pro   |
| **Librarian**         | 문서 탐색, 코드 구조 파악, 리서치     | gemini-3-flash |
| **Explore**           | 빠른 파일 검색, 패턴 매칭, 정찰       | gemini-3-flash |
| **Frontend**          | UI/UX, 스타일링, 접근성               | gemini-3-flash |
| **Multimodal**        | 시각 분석, 목업 이미지 해석           | gemini-3-pro   |
| **Doc_Writer**        | README, API 문서, 주석 작성           | gemini-3-flash |
| **Prometheus**        | 전략 기획, 요구사항 구체화            | gemini-3-pro   |
| **Momus**             | 비판적 검토, 리스크 식별              | gemini-3-pro   |
| **Sisyphus**          | 작업 조율, 태스크 위임 (PM)           | gemini-3-flash |
| **Junior**            | 구현, 코딩, 버그 수정                 | gemini-3-flash |
| **Quality_Validator** | 최종 검증 및 테스트 (필수 포함)       | gemini-3-flash |

---

## 프로토콜 및 아키텍처 (Protocol & Architecture)

### "Manus Protocol"

이 스킬은 엄격한 상태 관리 프로토콜을 따릅니다:

- **`task_plan.md`**: 작업의 마스터 체크리스트.
- **`findings.md`**: 에이전트 간 지식을 공유하는 스크래치패드.
- **`progress.md`**: 수행한 작업의 불변 로그 (Log).

### "Validator" 규칙

설계상, 생성된 모든 팀의 **마지막 에이전트**는 반드시 **Quality Validator(품질 검증가)**여야 합니다.

- **역할**: 리뷰어 / QA.
- **임무**: `task_plan.md` 완료 여부 확인, 테스트 실행, 사용자 요구사항 충족 여부 검증.
- **이점**: 스스로 오류를 수정하는 루프(Self-correction loop)를 형성합니다.

---

## 디렉토리 구조 (Directory Structure)

```text
antigravity-swarm/
├── scripts/
│   ├── planner.py       # "Hiring Manager" (subagents.yaml 생성)
│   ├── orchestrator.py  # "Project Manager" (에이전트 실행 및 관리)
│   ├── dispatch_agent.py # "Worker" (Gemini CLI 연동 Shim Layer)
│   └── ultrawork_loop.py # "Autonomous Loop" (자율 반복 루프)
├── subagents.yaml       # 현재 구성된 에이전트 명단
├── task_plan.md         # 현재 미션의 진행 상황
└── README.md            # 영문 설명서
```

---

## ⭐️ Credits & Inspiration

이 프로젝트는 **[Oh-My-Opencode](https://github.com/code-yeongyu/oh-my-opencode)**에서 깊은 영감을 받았습니다.

해당 프로젝트를 구축 시, 하기의 핵심 철학들을 차용했습니다:

- **멀티 에이전트 오케스트레이션 (Multi-Agent Orchestration)**: Oracle, Librarian, Sisyphus 등 특화된 역할을 활용합니다.
- **Manus 프로토콜 (The "Manus Protocol")**: `task_plan.md`, `findings.md`와 같은 영구 파일로 상태를 관리합니다. 이 패턴은 **[planning-with-files](https://github.com/OthmanAdi/planning-with-files)**에서 깊은 영감을 받았습니다.
- **Ultrawork Loop**: 자율적인 "계획 -> 실행 -> 검증" 사이클을 구현했습니다.

원작자 분들께 감사의 말씀을 전합니다.
