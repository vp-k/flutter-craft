# Flutter-Craft

[English](README.md) | [한국어](README.ko.md)

Claude Code를 위한 Flutter 개발 스킬 - Feature-Driven Development와 Clean Architecture.

## 개요

Flutter-Craft는 다음 원칙을 따르는 Flutter 개발 스킬 세트를 제공합니다:
- **Feature-Driven Development** (FDD) 워크플로우
- **Clean Architecture** (Domain → Data → Presentation)
- **우선순위 기반 테스트** (Repository → State → Widget)

## 설치

```bash
# 1단계: 마켓플레이스 추가
/plugin marketplace add https://github.com/vp-k/flutter-craft.git

# 2단계: 플러그인 설치
/plugin install flutter-craft@vp-k/flutter-craft
```

## 스킬

### 프로젝트 설정 스킬

| 스킬 | 설명 |
|------|------|
| `flutter-project-init` | Clean Architecture와 도메인 패턴으로 새 Flutter 프로젝트 생성 |

### 핵심 워크플로우 스킬

| 스킬 | 설명 |
|------|------|
| `start-flutter-craft` | 스킬 시스템 게이트키퍼 (세션 시작 시 자동 주입) |
| `flutter-brainstorming` | Clean Architecture로 기능 설계 |
| `flutter-planning` | 레이어 순서에 따른 구현 계획 생성 |
| `flutter-executing` | 검증 체크포인트와 함께 배치 실행 |
| `flutter-verification` | 증거 기반 완료 검증 |
| `flutter-debugging` | Flutter DevTools를 활용한 체계적 디버깅 |

### 테스트 & 리뷰 스킬

| 스킬 | 설명 |
|------|------|
| `flutter-testing` | 우선순위 기반 테스트 작성 (Repository → State → Widget) |
| `flutter-review-request` | Flutter 체크리스트로 코드 리뷰 요청 |
| `flutter-review-receive` | 리뷰 피드백 기술적으로 처리 |

### 유틸리티 스킬

| 스킬 | 설명 |
|------|------|
| `flutter-subagent-dev` | 태스크별 서브에이전트와 2단계 리뷰 |
| `flutter-parallel-agents` | 독립 태스크 병렬 실행 |
| `flutter-worktrees` | Flutter 설정이 포함된 격리된 워크스페이스 |
| `flutter-finishing` | 완료 워크플로우 (merge/PR/keep/discard) |
| `flutter-writing-skills` | 새로운 flutter-craft 스킬 생성 |

## 명령어

| 명령어 | 설명 |
|--------|------|
| `/brainstorm` | 기능 설계 시작 |
| `/plan` | 구현 계획 생성 |
| `/execute` | 배치로 계획 실행 |

## Clean Architecture

Flutter-Craft는 Clean Architecture 레이어 순서를 강제합니다:

```
lib/features/<feature>/
├── domain/           # 첫 번째: Entities, Repository 인터페이스, UseCases
├── data/             # 두 번째: Models, DataSources, Repository 구현
└── presentation/     # 세 번째: 상태 관리, Widgets, Screens
```

## 테스트 우선순위

1. **우선순위 1:** Repository & DataSource 단위 테스트 (비즈니스 로직)
2. **우선순위 2:** 상태 관리 단위 테스트 (BLoC/Provider/Riverpod)
3. **우선순위 3:** Widget 테스트 (선택사항, 복잡한 UI용)

## 워크플로우 예시

### 새 프로젝트 시작

```
flutter-project-init → flutter-brainstorming → flutter-planning → flutter-executing
```

### 기존 프로젝트에 기능 추가

```
1. 사용자: "로그인 기능 추가해줘"

2. Claude: flutter-brainstorming 사용
   - 요구사항 탐색
   - Clean Architecture 구조 설계
   - docs/plans/YYYY-MM-DD-auth-design.md에 저장

3. Claude: flutter-planning 사용
   - 레이어 순서에 따른 태스크 목록 생성
   - docs/plans/YYYY-MM-DD-auth-plan.md에 저장

4. Claude: flutter-executing 사용
   - 한 번에 3개 태스크 실행
   - 각 배치 후 flutter analyze 실행
   - 진행 상황 보고

5. Claude: flutter-verification 사용
   - flutter analyze, flutter test 실행
   - 빌드 검증

6. Claude: flutter-finishing 사용
   - 4가지 옵션 제시 (merge/PR/keep/discard)
   - 선택한 옵션 실행
```

## 상태 관리 지원

Flutter-Craft는 여러 상태 관리 패턴을 지원합니다:

- **Riverpod + Freezed** (새 프로젝트에 권장)
- BLoC / Cubit
- Provider

선택한 패턴은 프로젝트 내에서 일관되게 사용해야 합니다.

## 권장 패키지

```bash
# 상태 관리 (하나 선택)
flutter pub add flutter_riverpod    # 권장
flutter pub add flutter_bloc        # 대안

# 불변 상태 & 코드 생성
flutter pub add freezed_annotation
flutter pub add dev:freezed
flutter pub add dev:build_runner

# 라우팅
flutter pub add go_router

# 네트워크
flutter pub add dio

# DI (의존성 주입)
flutter pub add get_it
flutter pub add injectable
flutter pub add dev:injectable_generator

# Riverpod 코드 생성 (Riverpod 사용 시)
flutter pub add dev:riverpod_generator

# 테스트
flutter pub add dev:mocktail
flutter pub add dev:bloc_test
```

## 디렉토리 구조

```
flutter-craft/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   └── flutter-code-reviewer.md
├── commands/
│   ├── brainstorm.md
│   ├── plan.md
│   └── execute.md
├── hooks/
│   ├── hooks.json
│   ├── run-hook.cmd
│   └── session-start.sh
├── lib/
│   └── skills-core.js
├── skills/
│   ├── start-flutter-craft/
│   ├── flutter-project-init/
│   ├── flutter-brainstorming/
│   ├── flutter-planning/
│   ├── flutter-executing/
│   ├── flutter-verification/
│   ├── flutter-debugging/
│   ├── flutter-testing/
│   ├── flutter-review-request/
│   ├── flutter-review-receive/
│   ├── flutter-subagent-dev/
│   ├── flutter-parallel-agents/
│   ├── flutter-worktrees/
│   ├── flutter-finishing/
│   └── flutter-writing-skills/
└── tests/
    └── sample-flutter-project/
```

## 라이선스

MIT
