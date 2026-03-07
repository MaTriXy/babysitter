# Themes -- Install Instructions

Welcome to **Themes** -- the plugin that gives your Claude Code project a complete thematic identity. Themes combines sound effects (from the sound-hooks lineage), visual design systems, conversational personality, and decorative assets into a single cohesive package.

Everything is configured at the **project level** -- even when installed globally, all theme artifacts live in the project's `.a5c/` directory so each project can have its own identity.

---

## Step 1: Interview the User

Before doing anything, gather these preferences:

### Theme Selection

Ask the user what theme they want. **Anything goes.** There are no predefined options -- the user names a concept and the installer builds the theme from scratch. A theme can be based on:

- A specific movie, TV show, or franchise ("Blade Runner", "The Office", "Star Trek TNG")
- A specific video game ("Zelda: Breath of the Wild", "Hollow Knight", "Portal")
- A music genre or artist aesthetic ("lo-fi hip hop", "synthwave", "Beethoven")
- An art movement or visual style ("Art Deco", "Bauhaus", "Ukiyo-e", "Brutalism")
- A historical period or culture ("Ancient Egypt", "Victorian England", "1980s Tokyo")
- A fictional universe ("Middle-earth", "Dune", "Warhammer 40K")
- A profession or domain ("nautical", "aerospace", "alchemy", "detective noir")
- A mood or abstract concept ("cozy autumn", "deep ocean", "neon dreamscape")
- A character or persona ("GLaDOS", "a sarcastic butler", "an excited puppy")
- Or literally anything else the user can describe

### Narrowing the Theme (Interview Questions)

Once the user states their theme concept, ask follow-up questions to pin down the four dimensions:

**1. Sounds** -- What should the project *sound like*?
- "What kind of sounds fit this theme for success events? Failure events? General activity?"
- "Any specific sound effects you associate with this theme?"
- "Should the sounds be subtle/ambient or bold/attention-grabbing?"

**2. Design** -- What should the project *look like*?
- "What colors come to mind for this theme?"
- "What kind of fonts or typography -- clean and modern, ornate, hand-drawn, monospaced?"
- "Light or dark aesthetic? Minimalist or decorative?"
- "Any specific visual motifs -- patterns, textures, borders?"

**3. Conversation** -- How should Claude *talk*?
- "Should Claude adopt a character voice or just a tonal shift?"
- "Any specific vocabulary, catchphrases, greetings, or speech patterns?"
- "How much personality -- subtle flavor or full roleplay?"
- "How should Claude refer to coding concepts in this theme's language?"

**4. Assets** -- What decorative elements are needed?
- "What kind of icons fit this theme?"
- "Any specific decorative motifs for dividers, borders, headers?"
- "Preferred image style -- vector/SVG, pixel art, photographic, illustrated?"

The user doesn't need to answer every question -- use your knowledge of the theme to fill in reasonable defaults for anything left open. Present your interpretation back to the user for confirmation before proceeding.

### Deriving Theme Details Autonomously

After the interview, **research the theme** to build out all four dimensions:

1. **Web search** for the theme's visual language, color palettes, typography, and iconic imagery
2. **Identify** characteristic sounds, music styles, and audio cues associated with the theme
3. **Determine** speech patterns, vocabulary, and personality traits that fit the theme
4. **Draft** a complete theme profile covering all four dimensions
5. **Present** the profile to the user for approval or adjustment

For well-known themes (specific games, movies, art styles), lean on existing cultural knowledge. For abstract or unusual themes, ask more questions upfront.

### Integration Scope

Each theme dimension is **optional**. Ask the user which integrations they want enabled for this project:

| Integration | What It Does | Default |
|---|---|---|
| **Conversational personality** | Adds speech pattern / persona instructions to CLAUDE.md so Claude talks in the theme's voice | on |
| **Sound hooks** | Plays themed audio on Claude Code lifecycle events (session start, tool use, errors, notifications) | on |
| **Design system** | Adds color palette, typography, component guidelines to CLAUDE.md for styled output generation | on |
| **Decorative assets** | Downloads/generates icons, dividers, backgrounds, and other visual assets for reports and UI | on |
| **Babysitter hooks** | Plays themed audio on babysitter orchestration events (run start/complete/fail, breakpoints) | off |

The user can pick any combination. For example:
- "Just sounds, no personality change" -- enable sound hooks only
- "Full immersion" -- everything on
- "Design system and assets only" -- no sounds, no personality, just visual theming
- "Personality only" -- just the conversational style in CLAUDE.md, nothing else

Record which integrations the user wants. Steps below are skipped for disabled integrations.

### Sound Preferences (if sound hooks enabled)

Ask:
- Which events should play sounds? (SessionStart, Stop, PostToolUse, PostToolUseFailure, Notification, UserPromptSubmit)
- Per-tool sound differentiation for PostToolUse? (recommended)
- See the sound-hooks install.md for the full event/tool matrix

### Design System Depth (if design system enabled)

Ask how deep the design system should go:
- **Light** -- color palette, typography, basic component styles only
- **Standard** -- colors, typography, component library, layout patterns, spacing system
- **Full** -- complete design system with tokens, component specs, animation guidelines, responsive patterns, accessibility notes

### Scope Confirmation

Confirm: **Themes always configures at the project level.** Even if installed globally, all assets, CLAUDE.md modifications, and hooks target the current project. Ask the user which project directory to configure (default: current working directory).

### Existing Project Conventions

**Before overwriting anything**, check:
1. Does the project already have a design system or style guide documented?
2. Does the CLAUDE.md already specify conversational tone or style?
3. Are there existing UI frameworks or component libraries in use?

If any exist, the theme should **complement and extend** rather than replace. Ask the user how to handle conflicts.

---

## Step 2: Detect Platform and Audio Player

Same as sound-hooks. Determine what audio player is available to decide sound format (WAV vs MP3).

### Player Compatibility Matrix

| Player | MP3 | WAV | Platform | Notes |
|---|---|---|---|---|
| **mpv** | yes | yes | All | Best choice. Lightweight, CLI-friendly, plays everything. |
| afplay | yes | yes | macOS only | Built-in, no install needed. |
| paplay | **no** | yes | Linux (PulseAudio) | Cannot play MP3. |
| aplay | **no** | yes | Linux (ALSA) | Cannot play MP3. |
| mpg123 | yes | **no** | Linux/macOS | Cannot play WAV. |
| powershell.exe SoundPlayer | **no** | yes | Windows | Slow startup, WAV only. |

### Check for mpv

```bash
command -v mpv &>/dev/null && echo "mpv found in PATH"
```

**Windows gotcha**: mpv may be installed but not in the bash PATH. Check common install locations:

```bash
for dir in \
  "/c/Program Files/MPV Player" \
  "/c/Program Files/mpv" \
  "/c/ProgramData/chocolatey/bin" \
  "$HOME/scoop/apps/mpv/current" \
  "$HOME/AppData/Local/Microsoft/WinGet/Packages"/mpv-player.mpv_*/mpv; do
  [ -x "$dir/mpv.exe" ] && echo "Found mpv at: $dir/mpv.exe" && break
done
```

If mpv is not found, offer to install it (see sound-hooks install.md Step 2 for platform-specific install commands).

---

## Step 3: Create Directory Structure

Create the theme directory hierarchy. The `.a5c/theme` path is a symbolic link pointing to the active theme under `.a5c/themes/[name]`.

```bash
THEME_NAME="<selected-theme>"  # e.g., "blade-runner", "hollow-knight", "art-deco", "cozy-autumn"

# Theme storage root
mkdir -p .a5c/themes/$THEME_NAME/sounds
mkdir -p .a5c/themes/$THEME_NAME/assets/icons
mkdir -p .a5c/themes/$THEME_NAME/assets/decorations
mkdir -p .a5c/themes/$THEME_NAME/assets/backgrounds
mkdir -p .a5c/themes/$THEME_NAME/design-system

# Sound hooks scripts (shared across themes)
mkdir -p .claude/sound-hooks/scripts

# Create symlink: .a5c/theme -> .a5c/themes/<name>
# Remove existing symlink if present
[ -L .a5c/theme ] && rm .a5c/theme
[ -d .a5c/theme ] && echo "WARNING: .a5c/theme is a real directory, not a symlink. Back it up before proceeding." && exit 1
ln -s themes/$THEME_NAME .a5c/theme
```

**Windows note**: On Windows (Git Bash / MSYS2), `ln -s` may require Developer Mode enabled or elevated privileges. If symlink creation fails, fall back to a junction:

```bash
# Windows fallback: use junction instead of symlink
cmd //c "mklink /J .a5c\\theme .a5c\\themes\\$THEME_NAME"
```

Or as a last resort, copy the directory and note in `theme.yaml` that it's a copy rather than a link.

---

## Step 4: Create Theme Descriptor (theme.yaml)

Write `.a5c/themes/<name>/theme.yaml` -- this is the single source of truth for the theme's identity and asset locations.

```yaml
# Theme descriptor -- defines the active theme and its assets
name: "<theme-name>"
version: "1.0.0"
description: "<one-line description of the theme>"
author: "<user or a5c-ai>"
createdAt: "<ISO 8601 timestamp>"

# Which integrations are active (all optional, set during install interview)
integrations:
  conversationalPersonality: true   # Adds speech pattern instructions to CLAUDE.md
  soundHooks: true                  # Plays themed audio on Claude Code lifecycle events
  designSystem: true                # Adds design tokens and component guidelines to CLAUDE.md
  decorativeAssets: true            # Downloads/generates icons, dividers, backgrounds
  babysitterHooks: false            # Plays themed audio on babysitter orchestration events

# Conversational style instructions for CLAUDE.md
conversation:
  style: "<brief style name>"  # e.g., "glados-ai", "cozy-librarian", "noir-detective"
  instructions: |
    <Multi-line instructions for Claude's conversational tone.
    These get injected into CLAUDE.md verbatim.
    Include speech patterns, vocabulary, greeting/farewell style,
    metaphor preferences, and personality traits.>

# Design system reference
designSystem:
  depth: "<light|standard|full>"
  palette:
    primary: "<hex>"
    secondary: "<hex>"
    accent: "<hex>"
    background: "<hex>"
    surface: "<hex>"
    text: "<hex>"
    textSecondary: "<hex>"
    error: "<hex>"
    success: "<hex>"
    warning: "<hex>"
  typography:
    headingFont: "<font family>"
    bodyFont: "<font family>"
    monoFont: "<font family>"
    baseFontSize: "<size>"
    scaleRatio: "<ratio>"
  borders:
    style: "<description of border aesthetic>"
    radius: "<default border radius>"
  spacing:
    unit: "<base spacing unit>"
    scale: [1, 2, 3, 4, 6, 8, 12, 16]
  animations:
    style: "<description -- e.g., subtle and smooth, bouncy, glitchy>"
    duration: "<default transition duration>"
  notes: |
    <Any additional design system notes, component guidelines,
    accessibility considerations, responsive breakpoints, etc.>

# Asset manifest
assets:
  sounds:
    sessionStart: "sounds/session-start.wav"
    stop: "sounds/stop.wav"
    toolSuccess: "sounds/tool-success.wav"
    toolFailure: "sounds/tool-failure.wav"
    notification: "sounds/notification.wav"
    userPrompt: "sounds/user-prompt.wav"
    # Per-tool sounds (optional)
    toolRead: "sounds/tool-read.wav"
    toolEdit: "sounds/tool-edit.wav"
    toolBash: "sounds/tool-bash.wav"
    toolSearch: "sounds/tool-search.wav"
    toolAgent: "sounds/tool-agent.wav"
    toolWeb: "sounds/tool-web.wav"
    # Babysitter hooks (optional)
    onRunStart: "sounds/on-run-start.wav"
    onRunComplete: "sounds/on-run-complete.wav"
    onRunFail: "sounds/on-run-fail.wav"
    onTaskStart: "sounds/on-task-start.wav"
    onTaskComplete: "sounds/on-task-complete.wav"
    onBreakpoint: "sounds/on-breakpoint.wav"
  icons:
    - "assets/icons/<name>.svg"
  decorations:
    - "assets/decorations/<name>.svg"
  backgrounds:
    - "assets/backgrounds/<name>.png"
  designSystemFile: "design-system/system.md"

# Sound configuration (mirrors sound-hooks config.json)
soundConfig:
  events:
    SessionStart: { enabled: true }
    Stop: { enabled: true }
    PostToolUse: { enabled: true, perTool: true }
    PostToolUseFailure: { enabled: true }
    Notification: { enabled: true }
    UserPromptSubmit: { enabled: false }
```

Also create the symlinked reference at `.a5c/theme/theme.yaml` (accessible via the symlink).

---

## Step 5: Search and Download Sound Files

**Skip this step if `soundHooks` integration is disabled.**

Follow the same process as sound-hooks install.md Step 4, but download to the theme-specific directory:

```
.a5c/themes/<name>/sounds/session-start.wav
.a5c/themes/<name>/sounds/stop.wav
.a5c/themes/<name>/sounds/tool-success.wav
.a5c/themes/<name>/sounds/tool-failure.wav
.a5c/themes/<name>/sounds/notification.wav
.a5c/themes/<name>/sounds/user-prompt.wav
```

And per-tool sounds if enabled:

```
.a5c/themes/<name>/sounds/tool-read.wav
.a5c/themes/<name>/sounds/tool-edit.wav
.a5c/themes/<name>/sounds/tool-bash.wav
.a5c/themes/<name>/sounds/tool-search.wav
.a5c/themes/<name>/sounds/tool-agent.wav
.a5c/themes/<name>/sounds/tool-web.wav
```

**Derive search keywords from the theme.** For each event, think about what sound would thematically represent that lifecycle moment:

| Event | What It Represents | How to Derive Keywords |
|---|---|---|
| SessionStart | Beginning, arrival, powering on | What does "starting" sound like in this theme's world? |
| Stop | Completion, success, finishing | What does "done" or "victory" sound like? |
| PostToolUse (per-tool) | Activity, working, processing | What does each tool's action (reading, writing, executing, searching, dispatching, fetching) sound like? |
| PostToolUseFailure | Error, failure, problem | What does "something went wrong" sound like? |
| Notification | Attention, alert, incoming info | What grabs attention in this theme's world? |
| UserPromptSubmit | User input, communication | What does "message sent" or "speaking" sound like? |

**Example**: For a "Hollow Knight" theme, SessionStart might be "crystal cave chime", Stop might be "bench rest sound effect", failure might be "void damage sound", notification might be "dream nail sound effect".

**Example**: For an "Art Deco" theme, SessionStart might be "jazz trumpet intro", Stop might be "cocktail glass clink", failure might be "record scratch", notification might be "champagne cork pop".

### Download Sources -- Ranked by Agent Friendliness

1. **[SoundBible](https://soundbible.com/)** -- Direct curl download via `http://soundbible.com/grab.php?id=<ID>&type=mp3`. Agent-friendly.
2. **[Orange Free Sounds](https://orangefreesounds.com/)** -- Direct download URLs in page source. CC BY-NC 4.0.
3. **[Mixkit](https://mixkit.co/free-sound-effects/)** -- High quality, royalty-free. Agent limitation: JS-loaded download URLs -- use Playwright if curl fails.
4. **[Pixabay Sound Effects](https://pixabay.com/sound-effects/)** -- CC0 license. Agent limitation: 403 on automated fetch -- use Playwright or ask user.
5. **[Freesound.org](https://freesound.org/)** -- Huge library. Agent limitation: requires login -- have user download manually.

Verify each download:
```bash
file .a5c/themes/<name>/sounds/session-start.wav
```

---

## Step 6: Create or Generate Theme Assets

**Skip this step if `decorativeAssets` integration is disabled.**

Based on the selected theme, create decorative assets. These are used in reports, product pages, README files, and other project outputs.

### Icons

Create or find SVG icons matching the theme aesthetic. Store in `.a5c/themes/<name>/assets/icons/`. At minimum:
- `logo.svg` -- a theme-styled project icon
- `success.svg` -- success/completion indicator
- `error.svg` -- error/failure indicator
- `info.svg` -- informational indicator
- `warning.svg` -- warning indicator

### Decorations

Create decorative elements for reports and documents:
- `divider.svg` -- horizontal divider/separator
- `header-decoration.svg` -- top-of-page decoration
- `footer-decoration.svg` -- bottom-of-page decoration
- `border-pattern.svg` -- repeating border pattern (if applicable)

### Backgrounds

Create or find background patterns/textures:
- `page-bg.png` or `page-bg.svg` -- subtle background texture
- `card-bg.png` -- card/panel background

For all assets: prefer SVG for scalability. Use royalty-free or CC-licensed sources. If suitable assets cannot be found online, describe the desired asset in detail in the `theme.yaml` so it can be created later by a designer or AI image generator.

Update the `assets` section of `theme.yaml` with actual filenames.

---

## Step 7: Write the Design System Document

**Skip this step if `designSystem` integration is disabled.**

Create `.a5c/themes/<name>/design-system/system.md` based on the theme and the depth chosen in Step 1.

This document is referenced from `theme.yaml` and optionally included in CLAUDE.md. It should be written as **instructions for Claude** to follow when generating UI, reports, or styled outputs.

### Example structure (standard depth):

```markdown
# <Theme Name> Design System

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| primary | #... | Primary actions, headings, links |
| secondary | #... | Secondary actions, badges |
| accent | #... | Highlights, decorative elements |
| background | #... | Page backgrounds |
| surface | #... | Cards, panels, modals |
| text | #... | Body text |
| text-secondary | #... | Captions, labels, muted text |
| error | #... | Error states, destructive actions |
| success | #... | Success states, confirmations |
| warning | #... | Warning states, caution notices |

## Typography

- **Headings**: <font family>, <weight>
- **Body**: <font family>, <weight>
- **Monospace**: <font family>
- **Base size**: <size>
- **Scale**: <ratio> (e.g., 1.25 major third)

## Component Guidelines

<Theme-specific component styling rules: buttons, cards, inputs, tables, etc.>

## Layout & Spacing

<Grid, spacing scale, breakpoints>

## Decorative Elements

<How to use the theme's icons, dividers, backgrounds. When to apply decorations vs keeping things clean.>

## Accessibility

<Contrast ratios, focus indicators, motion preferences>
```

---

## Step 8: Create the Play Script

**Skip this step if `soundHooks` integration is disabled.**

Create `.claude/sound-hooks/scripts/play.sh` -- identical to the sound-hooks version but with paths pointing to `.a5c/theme/sounds/` via the symlink:

```bash
#!/bin/bash
# Themes plugin -- play a sound effect for a Claude Code event
# Usage: play.sh <sound-file>
#
# Plays the sound in the background (non-blocking) using whatever
# audio player is available on the system.

SOUND="$1"

if [ ! -f "$SOUND" ]; then
  exit 0
fi

# Find mpv
MPV_BIN=""
if command -v mpv &>/dev/null; then
  MPV_BIN="mpv"
else
  for dir in \
    "/c/Program Files/MPV Player" \
    "/c/Program Files/mpv" \
    "/c/ProgramData/chocolatey/bin" \
    "$HOME/scoop/apps/mpv/current"; do
    if [ -x "$dir/mpv.exe" ]; then
      MPV_BIN="$dir/mpv.exe"
      break
    fi
  done
  if [ -z "$MPV_BIN" ]; then
    for f in "$HOME/AppData/Local/Microsoft/WinGet/Packages"/mpv-player.mpv_*/mpv/mpv.exe; do
      [ -x "$f" ] && MPV_BIN="$f" && break
    done
  fi
fi

if [ -n "$MPV_BIN" ]; then
  "$MPV_BIN" --no-video --really-quiet "$SOUND" &
elif command -v afplay &>/dev/null; then
  afplay "$SOUND" &
elif command -v mpg123 &>/dev/null; then
  mpg123 -q "$SOUND" &
elif command -v paplay &>/dev/null; then
  paplay "$SOUND" &
elif command -v aplay &>/dev/null; then
  aplay "$SOUND" &
elif command -v powershell.exe &>/dev/null; then
  powershell.exe -c "(New-Object Media.SoundPlayer '$SOUND').PlaySync()" &
fi

exit 0
```

Make it executable:
```bash
chmod +x .claude/sound-hooks/scripts/play.sh
```

---

## Step 9: Modify CLAUDE.md

**Skip this step entirely if none of `conversationalPersonality`, `designSystem`, or `decorativeAssets` are enabled.** If at least one of those integrations is active, this step applies.

This is the core differentiator from sound-hooks. The themes plugin injects theme-aware instructions into the project's `CLAUDE.md`.

### Read existing CLAUDE.md first

Read the current CLAUDE.md (if it exists). Identify:
- Existing style/tone instructions (do not duplicate or conflict)
- Existing design system references (complement, don't replace)
- The right insertion point (typically after project description, before technical instructions)

### Add Theme Section

Append or insert a clearly delimited section. **Only include subsections for enabled integrations** -- omit any subsection whose integration is disabled:

```markdown
<!-- THEMES PLUGIN START — do not edit manually, managed by themes plugin -->
## Project Theme: <Theme Name>

### Conversational Style
<!-- only if conversationalPersonality is enabled -->

<Paste the conversation.instructions from theme.yaml here verbatim>

### Design System
<!-- only if designSystem is enabled -->

When generating reports, UI components, product pages, dashboards, or any styled output for this project, follow the **<Theme Name> Design System**:

<Summarize the key design tokens here: palette, typography, borders, spacing>

For the complete design system specification, refer to `.a5c/theme/design-system/system.md`.

### Theme Assets
<!-- only if decorativeAssets is enabled -->

Themed decorative assets are available in `.a5c/theme/assets/`:
- **Icons**: `.a5c/theme/assets/icons/` -- themed SVG icons for status indicators and UI elements
- **Decorations**: `.a5c/theme/assets/decorations/` -- dividers, borders, and ornamental elements
- **Backgrounds**: `.a5c/theme/assets/backgrounds/` -- subtle textures and patterns

Use these assets when generating HTML reports, README decorations, or styled output. Prefer theme assets over generic alternatives.

The active theme descriptor is at `.a5c/theme/theme.yaml`.
<!-- THEMES PLUGIN END -->
```

### Rules for CLAUDE.md modification

1. **Never remove existing content** -- only append or insert the theme section
2. **Check for conflicts** -- if existing instructions specify a conversational tone, ask the user whether to override or merge
3. **Use delimiters** -- the `<!-- THEMES PLUGIN START -->` / `<!-- THEMES PLUGIN END -->` markers allow clean removal during uninstall and reconfiguration
4. **Keep it concise** -- the CLAUDE.md section should summarize; the full design system lives in `.a5c/theme/design-system/system.md`

---

## Step 10: Configure Claude Code Hooks

**Skip this step if `soundHooks` integration is disabled.**

Read the existing `.claude/settings.json` first, then **merge** sound hook entries. Sound paths point through the `.a5c/theme` symlink.

### Basic hooks (no per-tool)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/session-start.wav"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/stop.wav"
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-failure.wav"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/notification.wav"
          }
        ]
      }
    ]
  }
}
```

### Per-tool PostToolUse hooks

If the user chose per-tool differentiation:

```json
"PostToolUse": [
  {
    "matcher": "^Read$",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-read.wav" }]
  },
  {
    "matcher": "^(Edit|Write)$",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-edit.wav" }]
  },
  {
    "matcher": "^Bash$",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-bash.wav" }]
  },
  {
    "matcher": "^(Grep|Glob)$",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-search.wav" }]
  },
  {
    "matcher": "^Agent$",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-agent.wav" }]
  },
  {
    "matcher": "^(WebSearch|WebFetch)$",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-web.wav" }]
  },
  {
    "matcher": "^(?!Read$|Edit$|Write$|Bash$|Grep$|Glob$|Agent$|WebSearch$|WebFetch$)",
    "hooks": [{ "type": "command", "command": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/tool-success.wav" }]
  }
]
```

### Merging rules

- If `hooks` already exists, add entries to the existing object (don't overwrite)
- If an event array already has entries, **append** theme hook entries to the array
- Only add hook entries for events the user enabled
- **Critical**: use negative lookahead in the per-tool fallback matcher to prevent double-firing (see sound-hooks install.md Step 7)

---

## Step 11: Register Plugin

Register at the **project** scope (always project, regardless of installation scope):

```bash
babysitter plugin:update-registry --plugin-name themes --plugin-version 1.0.0 --marketplace-name babysitter --project --json
```

---

## Step 12: Verify

### Sound verification

```bash
bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/session-start.wav
```

If you hear the sound, playback works. See sound-hooks install.md Step 9 for troubleshooting.

### Symlink verification

```bash
# Verify symlink points to correct theme
ls -la .a5c/theme
# Should show: .a5c/theme -> themes/<name>

# Verify theme.yaml is accessible through symlink
cat .a5c/theme/theme.yaml | head -5
```

### CLAUDE.md verification

```bash
# Verify theme section was added
grep -n "THEMES PLUGIN START" CLAUDE.md
grep -n "THEMES PLUGIN END" CLAUDE.md
```

### Asset verification

```bash
# Check assets exist
ls .a5c/theme/sounds/
ls .a5c/theme/assets/icons/
ls .a5c/theme/design-system/
```

---

## Step 13: Summary

After installation, the project should have:

```
.a5c/
  theme -> themes/<name>           # Symlink to active theme
  themes/
    <name>/
      theme.yaml                    # Theme descriptor (source of truth)
      sounds/                       # Audio files for Claude Code hooks
        session-start.wav
        stop.wav
        tool-success.wav
        tool-failure.wav
        notification.wav
        ...
      assets/
        icons/                      # Themed SVG icons
        decorations/                # Dividers, borders, ornaments
        backgrounds/                # Textures, patterns
      design-system/
        system.md                   # Complete design system specification

.claude/
  sound-hooks/
    scripts/
      play.sh                      # Cross-platform audio playback script
  settings.json                    # Updated with sound hook entries

CLAUDE.md                           # Updated with theme section
```

The theme is now active. Claude will:
- Play themed sounds on lifecycle events
- Use the themed conversational style in all responses
- Apply the design system when generating UI, reports, or styled output
- Reference theme assets when creating decorative elements

---

## Advanced: Babysitter Hooks Integration

For sounds on babysitter orchestration events, create additional sound files and register in `.a5c/hooks.json`:

```json
{
  "on-run-start": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/on-run-start.wav",
  "on-run-complete": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/on-run-complete.wav",
  "on-run-fail": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/on-run-fail.wav",
  "on-task-start": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/on-task-start.wav",
  "on-task-complete": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/on-task-complete.wav",
  "on-breakpoint": "bash .claude/sound-hooks/scripts/play.sh .a5c/theme/sounds/on-breakpoint.wav"
}
```
