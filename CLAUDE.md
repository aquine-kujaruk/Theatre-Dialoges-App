# Theater Rehearsal Player

A web app to help actors learn their lines by rehearsing with pre-generated AI audio of the other characters.

## Stack

- React + TypeScript + Vite
- No UI component library — custom CSS only
- Assets in `assets/` folder:
  - `assets/screenplay.json` — segments with speaker, start, end, text
  - `assets/audio.mp3` — full mixed audio with all characters in order

## screenplay.json format

```json
[
  {
    "id": 0,
    "speaker": "Peggy",
    "start": 0,
    "end": 2.4,
    "text": " All right, children, we're ready."
  },
  ...
]
```

## App behavior

### Mode selector

Two modes, selectable at the top:
- **Listen** — plays everything straight through, no interruptions
- **Rehearse** — user picks a character (Peggy or Ted), their segments are skipped and the player pauses before each one waiting for the user to continue

### Listen mode

Standard audio player:
- Play / Pause
- -15s / +15s skip buttons
- Progress bar (seekable)
- Current line displayed large in the center as audio plays, matched by timestamp to screenplay.json segments

### Rehearse mode

Same controls as Listen mode plus:
- Character selector (Peggy / Ted) shown once at mode entry, can be changed
- When the audio reaches the START of a user's segment, it pauses automatically
- The UI shows a clear "YOUR TURN" indicator
- A **Cue** button plays only the current user segment and then pauses again (so the user can hear how it should sound), without advancing the scene
- Pressing Play resumes from AFTER the user's segment (skips it), continuing with the next character
- The progress bar visually marks user segments in a different color so the user can see where their lines are

### Current line display

- Shows the text of the whichever segment is currently playing or about to play
- In rehearse mode, when paused at a user turn, shows the user's line text (dimmed or styled differently to indicate it's their turn)
- Speaker name shown above the line in smaller text

## Visual design

**Material Design dark mode** — follow Google's Material You dark theme conventions:
- Background: `#0F0F0F` (near black, not pure black)
- Surface: `#1C1C1E`
- Surface variant: `#2C2C2E`
- Primary accent: `#D0BCFF` (Material You default purple-ish tint on dark)
- On-surface text: `#E6E1E5`
- Secondary text: `#CAC4D0`
- Error/highlight: `#F2B8B5`

Typography:
- Use Google Fonts: `Roboto` for UI chrome, `Roboto Serif` or `Noto Serif` for the line display text (theatrical feel)
- Line text: large, 2rem+, centered, generous line height
- Speaker label: 0.75rem, uppercase, letter-spacing, secondary color

Layout:
- Full viewport height, centered column, max-width ~640px
- Mode and character selectors at the top
- Line display takes up the majority of vertical space
- Controls fixed at the bottom, Spotify-style
- Cue button appears only in rehearse mode, next to or above the play button

Controls bar (bottom):
- Left: -15s button
- Center: Play/Pause (larger, prominent)
- Right: +15s button
- Below or above: seekable progress bar with total duration
- In rehearse mode: Cue button (secondary style) floats above the controls or sits inline

## State logic notes

On load:
1. Fetch `assets/screenplay.json`
2. Build an array of segments sorted by `start`
3. Track `currentSegmentIndex` as audio plays using `timeupdate` events on the HTMLAudioElement

On timeupdate (rehearse mode):
- Check if `audio.currentTime >= segment[nextUserSegment].start`
- If yes: `audio.pause()`, set state to `waitingForUser = true`, highlight the line

On Play press (rehearse mode, waitingForUser):
- Seek to `segment[nextUserSegment].end`
- Resume playback
- Set `waitingForUser = false`

Cue button:
- Seek to `segment[currentUserSegment].start`
- Play until `audio.currentTime >= segment[currentUserSegment].end`
- Then pause, stay at same position (do not advance)

Progress bar in rehearse mode:
- Render user segments as colored regions on the bar using absolute-positioned divs calculated from `(start / duration) * 100%`

## File structure

```
src/
  App.tsx
  components/
    ModeSelector.tsx
    CharacterSelector.tsx
    LineDisplay.tsx
    PlayerControls.tsx
    ProgressBar.tsx
  hooks/
    useAudioPlayer.ts    ← all audio logic lives here
  types.ts               ← Segment interface, Mode type, etc.
  styles/
    global.css
    variables.css        ← all CSS custom properties (colors, spacing, type)
assets/
  screenplay.json
  audio.mp3
```

## Notes for implementation

- All audio logic (play, pause, seek, timeupdate listener, cue logic) should live in `useAudioPlayer.ts` as a custom hook — keep components dumb
- Do not use any audio visualization (waveform etc.) — keep it clean
- Avoid auto-playing on load — wait for user interaction
- The progress bar seek should work by clicking anywhere on the bar (calculate position from click offsetX / bar width * duration)
- In rehearse mode, seeking into a user segment via the progress bar is allowed — just don't auto-skip in that case, let it play through (edge case, not critical)

## Architecture decisions

### WaveSurfer.js + WebAudioPlayer (DO NOT replace with HTML5 `<audio>`)

The app uses WaveSurfer.js with the `WebAudioPlayer` backend (Web Audio API) instead of a plain HTML5 `<audio>` element. This is intentional and must not be changed.

**Reason — MP3 encoder padding offset:**

- MP3 encoders add small amounts of silence (padding) at the start/end of files to fill incomplete frames.
- HTML5 `<audio>` plays the file as-is, including this padding (~26ms for LAME encoder).
- Web Audio API (`decodeAudioData`) strips this padding, producing the "true" audio timeline.
- The `screenplay.json` timestamps were generated against the decoded (padding-stripped) audio — 57% of timestamps have 5-decimal precision matching 44100 Hz frame rate.
- Switching to HTML5 `<audio>` would introduce a systematic ~26ms offset in all segment boundaries, breaking rehearse mode pauses and cue playback.

**Consequence:** The full MP3 must be downloaded and decoded before playback can start. This is an accepted trade-off for timestamp accuracy.

### Segments are individual, not grouped

Each segment in `screenplay.json` is treated independently, even when consecutive segments share the same speaker. There is no block-grouping logic:

- In rehearse mode, the player pauses before each individual user segment, not before groups.
- Cue plays a single segment, not a block of consecutive same-speaker segments.
- The transcript displays each segment with its own speaker label.

### Audio file: mono, 112kbps, 44100 Hz

The `audio.mp3` is mono (single channel). It was converted from stereo because the content is dialogue and stereo adds no value. The bitrate (~112kbps) and sample rate (44100 Hz) were preserved from the original to avoid any timestamp drift against `screenplay.json`.

**Do not re-encode the audio** without regenerating `screenplay.json` timestamps, as re-encoding can shift the audio timeline.

### Removed assets

`words.json` and `scene.md` were removed from `public/assets/` — they were not referenced anywhere in the code and were adding unnecessary weight to the deploy.