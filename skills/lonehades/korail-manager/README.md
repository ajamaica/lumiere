# Korail Manager Skill (KTX/SRT 예약 매니저)

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>

## English

A skill to automate Korail (KTX/SRT) ticket reservations. This skill uses a patched version of the `korail2` library to bypass recent API response errors.

### Features

- **Search:** Find available trains between stations.
- **Watch & Auto-Reserve:** Continuously monitor sold-out trains and reserve them automatically as soon as a seat opens.
- **Cancel:** Cancel your reservations safely.

### Installation

```bash
clawhub install korail-manager
```

### Usage

Simply ask your OpenClaw agent:

- "Search for KTX from Seoul to Busan tomorrow afternoon."
- "Watch for sold-out tickets from Daejeon to Seoul this Friday after 6 PM and reserve it."
- "Cancel my recent reservation."

---

<a name="한국어"></a>

## 한국어

코레일(KTX/SRT) 승차권 예약을 자동화하는 OpenClaw 전용 스킬입니다. 최근 코레일 API 응답 변경으로 인한 오류를 해결한 패치 버전(`korail2`)을 내장하고 있습니다.

### 주요 기능

- **열차 조회:** 출발/도착역 간의 열차 시간표와 잔여 좌석을 조회합니다.
- **자동 감시 및 예약:** 매진된 열차를 실시간으로 감시하여 좌석이 생기는 즉시 자동으로 예약합니다.
- **예약 취소:** 예약된 승차권을 안전하게 취소합니다.

### 설치 방법

```bash
clawhub install korail-manager
```

### 사용 예시

에이전트에게 다음과 같이 요청하세요:

- "내일 오후 서울에서 부산 가는 KTX 찾아줘."
- "이번 주 금요일 오후 6시 이후 대전에서 서울 가는 매진된 표 나오면 바로 예약해 줘."
- "방금 예약한 거 취소해 줘."

---

### License

MIT
