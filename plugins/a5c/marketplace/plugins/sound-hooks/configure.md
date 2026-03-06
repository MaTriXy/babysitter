# Sound Hooks -- Configuration

Sound Hooks is highly configurable. Whether you want to swap themes, fine-tune which events trigger sounds, or drop in your own custom audio, this guide has you covered.

All configuration lives in `.claude/sound-hooks/config.json`. Hook entries live in `.claude/settings.json`.

---

## 1. Change Theme

Want to switch from Video Games to Sci-Fi? Here's how:

1. Ask the user which new theme they'd like:
   - **TV Shows** -- laugh tracks, dramatic stings, applause
   - **Movies** -- cinematic hits, orchestral reveals, Wilhelm screams
   - **Video Games** -- coin collects, level ups, game overs
   - **Sci-Fi** -- warp drives, phasers, computer beeps
   - **Custom** -- user provides their own files

2. Search the web for new royalty-free mp3 sound effects matching the new theme (see the sound mapping table in `install.md` for search keywords per event).

3. Download each new mp3 to `.claude/sound-hooks/sounds/`, replacing the existing files:
   ```
   .claude/sound-hooks/sounds/session-start.mp3
   .claude/sound-hooks/sounds/stop.mp3
   .claude/sound-hooks/sounds/tool-success.mp3
   .claude/sound-hooks/sounds/tool-failure.mp3
   .claude/sound-hooks/sounds/notification.mp3
   .claude/sound-hooks/sounds/user-prompt.mp3
   ```

4. Update the `"theme"` field in `config.json` to reflect the new choice:
   ```json
   {
     "theme": "sci-fi"
   }
   ```

---

## 2. Toggle Events

Control which Claude Code events trigger sounds by editing `config.json` and `.claude/settings.json`.

### Enable an event

1. Set `enabled` to `true` in `config.json`:
   ```json
   {
     "events": {
       "PostToolUse": { "enabled": true, "sound": "sounds/tool-success.mp3" }
     }
   }
   ```

2. Add the corresponding hook entry to `.claude/settings.json` (if not already present):
   ```json
   "PostToolUse": [
     {
       "matcher": ".*",
       "hooks": [
         {
           "type": "command",
           "command": "bash .claude/sound-hooks/scripts/play.sh .claude/sound-hooks/sounds/tool-success.mp3"
         }
       ]
     }
   ]
   ```

### Disable an event

1. Set `enabled` to `false` in `config.json`.
2. Remove or comment out the corresponding hook entry from `.claude/settings.json`.

### Available events

| Event | Default | Notes |
|-------|---------|-------|
| `SessionStart` | enabled | Plays when a new Claude Code session begins |
| `Stop` | enabled | Plays when Claude finishes responding |
| `PostToolUse` | disabled | Plays after every successful tool call -- can be noisy |
| `PostToolUseFailure` | enabled | Plays when a tool call fails |
| `Notification` | enabled | Plays on Claude Code notifications |
| `UserPromptSubmit` | disabled | Plays when user sends a message |

**Pro tip**: If you're working on a fast-paced session with many tool calls, keep `PostToolUse` disabled unless you enjoy a relentless barrage of dings.

---

## 3. Filter by Tool (PostToolUse)

You can play sounds only for specific tools by changing the `matcher` in `.claude/settings.json`:

```json
"PostToolUse": [
  {
    "matcher": "Edit|Write",
    "hooks": [
      {
        "type": "command",
        "command": "bash .claude/sound-hooks/scripts/play.sh .claude/sound-hooks/sounds/tool-success.mp3"
      }
    ]
  }
]
```

This only plays the sound when `Edit` or `Write` tools complete, ignoring `Read`, `Glob`, `Grep`, etc.

---

## 4. Custom Sounds

Want to use your own audio files? Just drop them in:

1. Place your mp3 file in `.claude/sound-hooks/sounds/`.
2. If using a different filename, update the `"sound"` path in `config.json` and the corresponding command in `.claude/settings.json`:

   ```json
   {
     "events": {
       "PostToolUseFailure": { "enabled": true, "sound": "sounds/sad-violin.mp3" }
     }
   }
   ```

   And in `.claude/settings.json`:
   ```json
   "command": "bash .claude/sound-hooks/scripts/play.sh .claude/sound-hooks/sounds/sad-violin.mp3"
   ```

**Tip**: Keep sound files short (under 5 seconds). Long audio clips will overlap with subsequent events.

---

## 5. Replace Individual Sounds

Don't want to change the whole theme, just one sound?

1. Search the web for a new royalty-free mp3 for the specific event (see the search keyword suggestions in `install.md`).
2. Download it and save it to `.claude/sound-hooks/sounds/<name>.mp3`, replacing the existing file.
3. That's it -- the play script picks up the new file on the next event.

No config changes needed if you keep the same filename.

---

## 6. Temporarily Disable All Sounds

To silence everything without uninstalling, remove or comment out all sound-hooks entries from the `hooks` object in `.claude/settings.json`. Re-add them to re-enable (see install.md Step 6 for the hook configuration).

---

## 7. Advanced: Add Babysitter Hooks

If you want sounds on babysitter-specific orchestration events (run start/complete/fail, task dispatch, breakpoints) in addition to the Claude Code hooks, see the "Advanced: Babysitter Hooks Integration" section at the bottom of `install.md`.

---

## Full Configuration Reference

Here's the complete `config.json` with all fields:

```json
{
  "version": "1.0.0",
  "theme": "video-games",
  "events": {
    "SessionStart": { "enabled": true, "sound": "sounds/session-start.mp3" },
    "Stop": { "enabled": true, "sound": "sounds/stop.mp3" },
    "PostToolUse": { "enabled": false, "sound": "sounds/tool-success.mp3" },
    "PostToolUseFailure": { "enabled": true, "sound": "sounds/tool-failure.mp3" },
    "Notification": { "enabled": true, "sound": "sounds/notification.mp3" },
    "UserPromptSubmit": { "enabled": false, "sound": "sounds/user-prompt.mp3" }
  }
}
```

Now go make some noise.
