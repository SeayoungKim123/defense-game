---
name: commit-push
description: 이모지 + Conventional Commits 형식으로 한국어 git 커밋을 생성하고 원격 저장소에 push 한다. 사용자가 "커밋하고 푸쉬", "/commit-push", "커밋 후 올려줘" 같이 커밋과 push 를 함께 요청할 때 사용. 변경 종류(feat·fix·refactor 등)에 맞는 이모지를 자동 선택, 본문은 why 중심. upstream 미설정 시 자동으로 -u origin <branch> 처리. force-push 는 사용자가 명시할 때만.
---

# /commit-push — 이모지 커밋 + 원격 push

이 스킬은 현재 변경 사항을 분석해 **이모지 + Conventional Commits 형식의 한국어 커밋 메시지** 를 작성해 단일 커밋을 만들고, 곧바로 **원격 저장소에 push** 합니다.

## 진행 절차

### 1) 컨텍스트 파악
다음 명령들을 병렬 실행해 변경 내용·브랜치·remote 상태를 함께 확인합니다.

```
git status
git diff HEAD
git branch --show-current
git log --oneline -10
git remote -v
git rev-parse --abbrev-ref --symbolic-full-name '@{u}'   # upstream 존재 여부 확인 (없으면 비-zero)
```

remote 가 하나도 없거나 git 저장소가 아니면 즉시 중단하고 사용자에게 보고. (init / remote add 는 사용자 결정)

### 2) 변경 분석 → 타입·이모지 선택
diff 와 status 를 보고 변경의 본질에 가장 맞는 타입 1개 선택. 여러 성격이 섞였으면 가장 비중 큰 것 우선.

| 이모지 | 타입 | 사용 시점 |
|---|---|---|
| ✨ | feat | 신규 기능 추가 |
| 🐛 | fix | 버그 수정 |
| ♻️ | refactor | 동작 변경 없는 구조 개선 |
| ⚡ | perf | 성능 개선 |
| 🎨 | style | 포맷·공백·세미콜론 등 비기능 변경 |
| 📝 | docs | 문서·주석 |
| ✅ | test | 테스트 추가/수정 |
| 📦 | build | 빌드·패키지·의존성 |
| 👷 | ci | CI/CD 설정 |
| 🧹 | chore | 잡일·설정·메타 (최후의 보루) |
| ⏪ | revert | 이전 커밋 되돌리기 |
| 🔥 | remove | 코드/파일 의도적 제거 |
| 🚀 | deploy | 배포 관련 |
| 🔒 | security | 보안 수정 |

선택 가이드:
- `chore` 는 마지막 보루. 더 구체적인 타입 우선.
- 새 기능 + 그 기능 문서 함께면 → `feat` (문서는 부수 효과)
- 리팩터링 중 발견한 작은 버그 함께 고쳤으면 → `refactor` (큰 비중 따라)

### 3) 메시지 작성

**형식**:
```
<emoji> <type>(<scope>): <subject>

<본문 — why 중심으로 1~3 단락>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**작성 규칙**:
- 한국어 작성
- 1행: 이모지 + 타입 + (선택)스코프 + 콜론 + 제목. 50자 권장
- 제목은 결과 서술형 (예: "추가" / "수정" / "분리")
- 본문은 **why 중심**: 왜 이 변경이 필요했는지, 어떤 제약·결정·대안이 있었는지
- "무엇을 했다(what)" 는 diff 가 말해주므로 본문에 반복하지 않음
- 마지막에 Co-Authored-By 트레일러 필수

### 4) 스테이징 + 커밋

`git add <특정 파일들>` + `git commit -m "..."` 을 함께 실행.

- `git add -A` / `git add .` 는 가급적 피하고 의도한 파일만 명시적으로 add (민감/대용량 파일 사고 방지)
- 커밋 메시지는 HEREDOC 으로 전달해 줄바꿈·이모지 보존
- amend 금지 (사용자 명시 요청 시에만)
- `--no-verify`, `--no-gpg-sign` 등 hook/서명 bypass 금지. hook 실패 시 원인 수정 후 새 커밋
- 커밋할 변경이 없으면 (`nothing to commit`) 빈 커밋 생성 금지 — 사용자에게 보고하고 종료

### 5) Push

커밋 성공을 확인한 다음 원격에 push.

**Upstream 분기 처리**:

| 상황 | 명령 |
|---|---|
| upstream 이 이미 설정되어 있음 | `git push` |
| upstream 미설정 (1단계의 `@{u}` 가 실패) | `git push -u origin <current-branch>` |

**금지 / 보호**:
- `--force`, `--force-with-lease` 는 사용자가 **명시적으로 force push 를 요청한 경우에만** 사용. 그 외에는 절대 사용 금지
- main / master 로의 force push 는 사용자가 명시해도 한 번 더 경고 후 진행 여부 재확인
- `--no-verify` 로 pre-push hook bypass 금지

push 가 non-fast-forward 등으로 거절되면 force 로 우회하지 말고 즉시 사용자에게 보고. (rebase / pull 결정은 사용자가)

### 6) 결과 보고

다음을 1~2 줄로 짧게 보고:
- 생성된 커밋의 단축 SHA + 1행 제목
- push 결과 (성공/거절). upstream 신규 설정 시 그 사실 명시.

추가 메시지·요약·이모지 나열 등 군더더기 없이 종료.

## 예시

### 신규 기능 + 일반 push
```
✨ feat(scenarios): 결제 취소 흐름 시나리오 추가

기존 결제 시나리오는 정상/한도/거절만 다루고 있어, 환불·정산 분쟁 위험이
큰 "결제 후 취소" 경로를 검증하지 못했음. 마이페이지 진입부터 상태 갱신
확인까지 한 시나리오에 묶음.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```
보고 예: `a1b2c3d ✨ feat(scenarios): 결제 취소 흐름 시나리오 추가 — origin/feature/cancel 로 push 완료`

### 신규 브랜치 첫 push
```
🐛 fix(login): 잠금 해제 시각 정책서와 일치시킴

...본문...

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```
보고 예: `e4f5g6h 🐛 fix(login): ... — upstream origin/fix/login-lock 신규 설정 후 push 완료`
