# Flutter-Craft

[English](README.md) | [한국어](README.ko.md)

Flutter development skills for Claude Code - Feature-Driven Development with Clean Architecture.

## Overview

Flutter-Craft provides a comprehensive set of skills for Flutter development, following:
- **Feature-Driven Development** (FDD) workflow
- **Clean Architecture** (Domain → Data → Presentation)
- **Priority-based Testing** (Repository → State → Widget)

## Installation

```bash
# Clone or download to your Claude plugins directory
git clone https://github.com/vp-k/flutter-craft ~/.claude/plugins/flutter-craft
```

## Skills

### Project Setup Skills

| Skill | Description |
|-------|-------------|
| `flutter-project-init` | Create new Flutter project with Clean Architecture and domain patterns |

### Core Workflow Skills

| Skill | Description |
|-------|-------------|
| `start-flutter-craft` | Skill system gatekeeper (auto-injected on session start) |
| `flutter-brainstorming` | Feature design with Clean Architecture |
| `flutter-planning` | Implementation plan with layer-ordered tasks |
| `flutter-executing` | Batch execution with verification checkpoints |
| `flutter-verification` | Evidence-based completion verification |
| `flutter-debugging` | Systematic debugging with Flutter DevTools |

### Testing & Review Skills

| Skill | Description |
|-------|-------------|
| `flutter-testing` | Priority-based test writing (Repository → State → Widget) |
| `flutter-review-request` | Request code review with Flutter checklist |
| `flutter-review-receive` | Process review feedback technically |

### Utility Skills

| Skill | Description |
|-------|-------------|
| `flutter-subagent-dev` | Per-task subagent with 2-stage review |
| `flutter-parallel-agents` | Parallel execution for independent tasks |
| `flutter-worktrees` | Isolated workspace with Flutter setup |
| `flutter-finishing` | Completion workflow (merge/PR/keep/discard) |
| `flutter-writing-skills` | Create new flutter-craft skills |

## Commands

| Command | Description |
|---------|-------------|
| `/brainstorm` | Start feature design |
| `/plan` | Create implementation plan |
| `/execute` | Execute plan in batches |

## Clean Architecture

Flutter-Craft enforces Clean Architecture layer order:

```
lib/features/<feature>/
├── domain/           # First: Entities, Repository interfaces, UseCases
├── data/             # Second: Models, DataSources, Repository implementations
└── presentation/     # Third: State Management, Widgets, Screens
```

## Test Priority

1. **Priority 1:** Repository & DataSource unit tests (business logic)
2. **Priority 2:** State Management unit tests (BLoC/Provider/Riverpod)
3. **Priority 3:** Widget tests (optional, for complex UI)

## Example Workflow

```
1. User: "Add login feature"

2. Claude: Uses flutter-brainstorming
   - Explores requirements
   - Designs Clean Architecture structure
   - Saves to docs/plans/YYYY-MM-DD-auth-design.md

3. Claude: Uses flutter-planning
   - Creates task list following layer order
   - Saves to docs/plans/YYYY-MM-DD-auth-plan.md

4. Claude: Uses flutter-executing
   - Executes 3 tasks at a time
   - Runs flutter analyze after each batch
   - Reports progress

5. Claude: Uses flutter-verification
   - Runs flutter analyze, flutter test
   - Verifies build

6. Claude: Uses flutter-finishing
   - Presents 4 options (merge/PR/keep/discard)
   - Executes chosen option
```

## State Management Support

Flutter-Craft supports multiple state management patterns:

- **Riverpod + Freezed** (Recommended for new projects)
- BLoC / Cubit
- Provider

The chosen pattern should be consistent within a project.

## Recommended Packages

```bash
# State Management (choose one)
flutter pub add flutter_riverpod    # Recommended
flutter pub add flutter_bloc        # Alternative

# Immutable States & Code Generation
flutter pub add freezed_annotation
flutter pub add dev:freezed
flutter pub add dev:build_runner

# Routing
flutter pub add go_router

# Network
flutter pub add dio

# DI
flutter pub add get_it
flutter pub add injectable
flutter pub add dev:injectable_generator

# Riverpod Code Generation (if using Riverpod)
flutter pub add dev:riverpod_generator

# Testing
flutter pub add dev:mocktail
flutter pub add dev:bloc_test
```

## Directory Structure

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

## License

MIT
