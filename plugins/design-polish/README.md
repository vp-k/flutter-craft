# design-polish

Claude Code plugin for design reference-based polishing with WCAG accessibility checks.

## Features

- Screenshot capture of local project
- Reference site trend search (Mobbin, Godly, Dribbble, etc.)
- Gap analysis between current design and trends
- WCAG accessibility checks (axe-core based)
- Auto-apply improvements

## Installation

```bash
# Clone the plugin
git clone https://github.com/[user]/design-polish ~/.claude/plugins/marketplaces/design-polish

# Install dependencies
cd ~/.claude/plugins/marketplaces/design-polish
npm install
```

## Usage

In Claude Code:

```
/design-polish                    # Full polishing + WCAG check
/design-polish --apply            # Polish + apply changes
/design-polish --wcag-only        # WCAG check only
/design-polish godly hero         # Search Godly for hero section
/design-polish --apply godly hero # Search + apply
```

## WCAG Checks

Accessibility checks based on axe-core:

| Check | WCAG Criteria |
|-------|---------------|
| Color contrast | 4.5:1 (AA) |
| Large text contrast | 3:1 (AA) |
| Touch target size | 44x44px |
| Text size | 12px minimum |

## Output

```
.design-polish/
├── screenshots/
│   ├── current-main.png
│   └── reference-*.png
└── accessibility/
    └── wcag-report.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| BASE_URL | http://localhost:3000 | Local server URL |
| OUTPUT_DIR | .design-polish/screenshots | Screenshot directory |
| A11Y_DIR | .design-polish/accessibility | Accessibility report directory |
| WAIT_TIME | 2000 | Wait time after page load (ms) |
| TIMEOUT | 30000 | Page load timeout (ms) |
| FULL_PAGE | false | Capture full page |

## License

MIT
