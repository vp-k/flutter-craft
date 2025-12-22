#!/usr/bin/env bash
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Read the start-flutter-craft skill content
SKILL_FILE="${PLUGIN_ROOT}/skills/start-flutter-craft/SKILL.md"

if [[ ! -f "$SKILL_FILE" ]]; then
    echo '{"error": "start-flutter-craft/SKILL.md not found"}'
    exit 1
fi

skill_content=$(cat "$SKILL_FILE")

# Function to escape content for JSON
escape_for_json() {
    local input="$1"
    local output=""
    local i char

    for ((i=0; i<${#input}; i++)); do
        char="${input:$i:1}"
        case "$char" in
            $'\\') output+='\\\\';;
            '"') output+='\\"';;
            $'\n') output+='\\n';;
            $'\r') output+='\\r';;
            $'\t') output+='\\t';;
            *) output+="$char";;
        esac
    done

    printf '%s' "$output"
}

escaped_content=$(escape_for_json "$skill_content")

# Output JSON for Claude Code to consume
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>\nYou have flutter-craft skills available.\n\n${escaped_content}\n</EXTREMELY_IMPORTANT>"
  }
}
EOF
