#!/usr/bin/env bash
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Only inject into Flutter projects: require a pubspec.yaml that depends on
# Flutter (cwd or one level up covers mono-repo roots). Non-Flutter sessions
# get nothing — silent exit is the "allow" for SessionStart hooks.
is_flutter_project() {
    local dir="$1"
    [[ -f "${dir}/pubspec.yaml" ]] && grep -qE '^[[:space:]]*(flutter|sdk:[[:space:]]*flutter)' "${dir}/pubspec.yaml"
}
flutter_project_found=false
if is_flutter_project "."; then
    flutter_project_found=true
else
    for sub in ./*/; do
        if is_flutter_project "${sub%/}"; then
            flutter_project_found=true
            break
        fi
    done
fi
if [[ "$flutter_project_found" != "true" ]]; then
    exit 0
fi

# Compact pointer only — the full gatekeeper doc (start-flutter-craft) loads
# on demand via the Skill tool. Injecting the whole skill here cost ~6KB per
# session (and again on every compact); the summary keeps the trigger rules
# without the standing tax.
context="<flutter-craft>
Flutter project detected. flutter-craft skills are available — invoke the matching skill via the Skill tool BEFORE responding:
- New feature/component/behavior change → flutter-craft:flutter-brainstorming (chains to planning → executing)
- Bug, error, test failure → flutter-craft:flutter-debugging
- About to claim done/complete/fixed → flutter-craft:flutter-verification FIRST
- Writing tests → flutter-craft:flutter-testing | Code review → flutter-craft:flutter-review-request
- New Flutter project from scratch → flutter-craft:flutter-project-init
Trivial change (single file, no behavior/state/dependency change): edit directly, then flutter-verification only.
Full skill list and rules: invoke flutter-craft:start-flutter-craft.
</flutter-craft>"

# Output JSON for Claude Code to consume — jq guarantees valid escaping
if command -v jq &>/dev/null; then
    jq -n --arg ctx "$context" '{
      "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": $ctx
      }
    }'
    exit 0
fi

# Fallback without jq: pure-bash JSON escaping (backslash first, then the rest)
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\t'/\\t}"
    s="${s//$'\n'/\\n}"
    printf '%s' "$s"
}

escaped_content=$(escape_for_json "$context")
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped_content"
