# Themes -- Configuration

The Themes plugin manages four dimensions of your project's identity: sounds, design system, conversational style, and decorative assets. This guide covers reconfiguring any of them.

**Key files**:
- `.a5c/theme/theme.yaml` -- the source of truth for the active theme
- `.a5c/theme/design-system/system.md` -- complete design system specification
- `.claude/settings.json` -- Claude Code hook entries for sound playback
- `CLAUDE.md` -- theme section with conversational style and design system summary

The `.a5c/theme` symlink points to `.a5c/themes/<active-theme>/`. All paths below are relative to the project root unless noted otherwise.

---

## 0. Toggle Integrations

Each theme dimension is independently toggleable. Edit `integrations` in `.a5c/theme/theme.yaml`:

```yaml
integrations:
  conversationalPersonality: true   # Speech patterns in CLAUDE.md
  soundHooks: true                  # Audio on Claude Code events
  designSystem: true                # Design tokens in CLAUDE.md
  decorativeAssets: true            # Icons, dividers, backgrounds
  babysitterHooks: false            # Audio on babysitter events
```

After changing a toggle:
- **Enabling** -- follow the corresponding install.md step to set up that integration (download sounds, generate assets, add CLAUDE.md section, etc.)
- **Disabling** -- remove the corresponding artifacts:
  - `conversationalPersonality`: remove the `### Conversational Style` subsection from CLAUDE.md's theme block
  - `soundHooks`: remove sound hook entries from `.claude/settings.json`
  - `designSystem`: remove the `### Design System` subsection from CLAUDE.md's theme block
  - `decorativeAssets`: remove the `### Theme Assets` subsection from CLAUDE.md's theme block (optionally delete asset files)
  - `babysitterHooks`: remove entries from `.a5c/hooks.json`

---

## 1. Switch Theme

Switch to a different theme entirely. This replaces all four dimensions.

### If the target theme already exists

If you've previously installed another theme and its directory exists under `.a5c/themes/`:

```bash
# Update symlink to point to existing theme
rm .a5c/theme
ln -s themes/<new-theme-name> .a5c/theme
```

Windows fallback (if symlinks fail):
```bash
cmd //c "rmdir .a5c\\theme"
cmd //c "mklink /J .a5c\\theme .a5c\\themes\\<new-theme-name>"
```

Then update CLAUDE.md:
1. Remove the content between `<!-- THEMES PLUGIN START -->` and `<!-- THEMES PLUGIN END -->` markers
2. Re-insert the new theme's conversational style and design system summary from the new `theme.yaml`

And update `.claude/settings.json` sound paths if the sound filenames differ between themes (if they use canonical names, no change needed since the symlink handles it).

### If the target theme is new

Follow install.md Steps 1-9 to create the new theme, but skip Steps 10-11 (hooks and registry are already configured). Only update the symlink and CLAUDE.md content.

---

## 2. Modify Conversational Style

Change how Claude speaks without switching the entire theme.

1. Edit the `conversation.instructions` field in `.a5c/theme/theme.yaml`:
   ```yaml
   conversation:
     style: "pirate-formal"
     instructions: |
       Speak with pirate vocabulary but maintain formal grammar.
       Use nautical metaphors for technical concepts.
       Address the user as "Captain" rather than "matey".
       ...
   ```

2. Update CLAUDE.md -- replace the content inside the theme section's `### Conversational Style` subsection with the new instructions. Preserve the `<!-- THEMES PLUGIN START/END -->` markers.

### Tips for writing conversational instructions

The instructions should cover:
- **Greeting/farewell style** -- how does Claude say hello and goodbye in this theme?
- **Vocabulary** -- what words, phrases, or jargon does this theme use?
- **Metaphors** -- how does the theme describe coding concepts? (bugs, deploys, refactors, tests)
- **Personality depth** -- subtle tonal shift or full character voice?
- **Boundaries** -- what should Claude NOT do? (e.g., "Don't break character mid-explanation", "Keep the accent light, don't sacrifice clarity")

The style can be anything -- a specific character voice (GLaDOS, a Tolkien narrator), a profession (Victorian butler, sports commentator), a mood (calm and zen, excitable), or a cultural register (formal academic, street slang). Research the theme if needed to capture authentic speech patterns.

---

## 3. Modify Design System

Adjust colors, typography, or component guidelines without switching themes.

### Quick palette change

Edit the `designSystem.palette` section in `theme.yaml`:
```yaml
designSystem:
  palette:
    primary: "#1a5276"
    secondary: "#2e86c1"
    accent: "#f39c12"
    ...
```

Then update `.a5c/theme/design-system/system.md` to match.

### Full design system edit

Edit `.a5c/theme/design-system/system.md` directly. This is the authoritative reference. After editing, update the summary in CLAUDE.md's theme section to reflect key changes.

### Change design system depth

If you want to go from "light" to "standard" or "full":

1. Update `designSystem.depth` in `theme.yaml`
2. Expand `.a5c/theme/design-system/system.md` with additional sections:
   - **light -> standard**: Add component library, layout patterns, spacing system
   - **standard -> full**: Add animation guidelines, responsive patterns, accessibility notes, design tokens

---

## 4. Manage Sound Events

### Toggle events on/off

Same as sound-hooks. Update two places:

1. In `theme.yaml`, set the event's `enabled` field:
   ```yaml
   soundConfig:
     events:
       PostToolUse: { enabled: false }
   ```

2. In `.claude/settings.json`, add or remove the corresponding hook entry.

### Enable/disable per-tool sounds

To switch between single-sound and per-tool PostToolUse:

- **Enable per-tool**: Replace the single `".*"` matcher with individual tool matchers (see install.md Step 10)
- **Disable per-tool**: Replace all per-tool entries with a single `".*"` matcher

Update `theme.yaml` accordingly:
```yaml
soundConfig:
  events:
    PostToolUse: { enabled: true, perTool: true }   # or false
```

### Matcher double-firing gotcha

Claude Code fires hooks for **every** matcher that matches. The fallback entry must use a negative lookahead excluding all explicitly-mapped tools:
```
^(?!Read$|Edit$|Write$|Bash$|Grep$|Glob$|Agent$|WebSearch$|WebFetch$)
```
Update this whenever you add or remove per-tool entries.

---

## 5. Replace Individual Sounds

1. Find or download a new royalty-free sound (see install.md Step 5 for sources)
2. Save to `.a5c/theme/sounds/<canonical-name>.wav`, replacing the existing file
3. If you kept the same filename, no config changes needed
4. If using a different filename, update `theme.yaml` and the hook command in `.claude/settings.json`

---

## 6. Change Sound Theme Without Changing Other Dimensions

Want different sounds without changing the rest of the theme?

1. Download new sounds to the current theme's `sounds/` directory, replacing existing files
2. Update `theme.yaml` sound asset entries if filenames changed
3. No need to touch CLAUDE.md, design system, or decorative assets

---

## 7. Manage Decorative Assets

### Add new assets

Place files in the appropriate subdirectory:
- Icons: `.a5c/theme/assets/icons/`
- Decorations: `.a5c/theme/assets/decorations/`
- Backgrounds: `.a5c/theme/assets/backgrounds/`

Update the `assets` section in `theme.yaml` to list new files.

### Replace assets

Drop replacements in the same directory with the same filename. No config changes needed.

### Reference assets in output

When generating styled output, Claude should reference assets via the `.a5c/theme/` symlink path:
```html
<img src=".a5c/theme/assets/icons/success.svg" alt="Success">
<hr style="background-image: url('.a5c/theme/assets/decorations/divider.svg')">
```

---

## 8. Manage Multiple Themes

The `.a5c/themes/` directory can hold multiple themes. Only one is active (pointed to by `.a5c/theme`).

### List available themes

```bash
ls .a5c/themes/
```

### Preview a theme

```bash
cat .a5c/themes/<name>/theme.yaml
```

### Delete a theme

```bash
# Make sure it's not the active theme first
readlink .a5c/theme
# If it points to the theme you want to delete, switch first
rm -rf .a5c/themes/<name>
```

---

## 9. Temporarily Disable Theme Effects

### Disable sounds only

Remove all theme sound hook entries from `.claude/settings.json`. Re-add them to re-enable (see install.md Step 10).

### Disable conversational style only

Remove or comment out the conversational style section between the theme markers in CLAUDE.md. The markers remain for easy re-insertion.

### Disable everything

Remove the entire `<!-- THEMES PLUGIN START -->` to `<!-- THEMES PLUGIN END -->` block from CLAUDE.md and remove sound hooks from `.claude/settings.json`. The theme files remain in `.a5c/themes/` for re-activation later.

---

## 10. Export/Import Themes

### Export a theme for sharing

```bash
cd .a5c/themes
tar czf <name>-theme.tar.gz <name>/
```

### Import a shared theme

```bash
cd .a5c/themes
tar xzf <name>-theme.tar.gz
# Then switch to it (from project root)
cd ../..
rm .a5c/theme 2>/dev/null
ln -s themes/<name> .a5c/theme
```

---

## Configuration Reference

### theme.yaml structure

| Section | Purpose |
|---|---|
| `name`, `version`, `description` | Theme identity |
| `integrations.*` | Which dimensions are active (all optional booleans) |
| `conversation.style` | Brief style label |
| `conversation.instructions` | Full conversational instructions for CLAUDE.md |
| `designSystem.depth` | light / standard / full |
| `designSystem.palette` | Color tokens |
| `designSystem.typography` | Font families and scale |
| `designSystem.borders` | Border aesthetic |
| `designSystem.spacing` | Spacing scale |
| `designSystem.animations` | Animation style |
| `designSystem.notes` | Additional guidelines |
| `assets.sounds` | Sound file paths (relative to theme root) |
| `assets.icons` | Icon file paths |
| `assets.decorations` | Decoration file paths |
| `assets.backgrounds` | Background file paths |
| `assets.designSystemFile` | Path to full design system doc |
| `soundConfig.events` | Which events are enabled and per-tool setting |
