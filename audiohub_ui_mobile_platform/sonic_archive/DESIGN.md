---
name: Sonic Archive
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#4a4455'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#7d3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a15100'
  on-tertiary-container: '#ffe0cd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes a focused, modern, and high-utility audio workspace. Built strictly for light mode, the visual direction synthesizes functional minimalism with precise editorial typography. The target audience comprises audiophiles, podcast curators, sound designers, and studio managers who demand systematic clarity, density control, and effortless navigation across massive audio catalogs. 

The emotional response should feel organized, professional, and tactile without resorting to skeuomorphism. Interactive feedback mimics precision audio gear—clean transitions, deliberate boundaries, and quiet surfaces. No neon tones, harsh glass effects, or superfluous ornamental gradients are permitted. Visual rhythm relies on structured white space, crisp structural lines, and purposeful color accents to elevate content discovery and audio playback controls.

## Colors
The palette utilizes an intentional hierarchy calibrated for sustained daytime viewing and complex data displays:

- **Primary (`#7C3AED`)**: Deep purple reserved for focused actions, active audio states, playback scrub heads, primary buttons, and key interactive signifiers.
- **Secondary (`#2563EB`)**: Royal blue used for secondary indicators, filter pills, informative tags, multi-select states, and auxiliary playback mechanics.
- **Background (`#F8FAFC`)**: Slate 50 provides an expansive base layer with minimal glare.
- **Surface (`#FFFFFF`)**: Pure white reserved for raised component contexts, elevated modal sheets, and active player bars.
- **Surface Container / Card (`#F1F5F9`)**: Slate 100 serves as structural grounding for resting cards, panel dividers, table headers, and scrub bar tracks.
- **Text Primary (`#111827`)**: Gray 900 ensures maximum legibility for titles, track numbers, and active values.
- **Secondary Text (`#64748B`)**: Slate 500 balances visual weight for metadata, durations, timestamps, and secondary captions.
- **Border (`#E2E8F0`)**: Slate 200 defines clean, 1px perimeter outlines across components.
- **Feedback Palette**:
  - Success: `#16A34A` (Green 600) for completed downloads and upload statuses.
  - Warning: `#F59E0B` (Amber 500) for licensing warnings, storage quotas, and low-bitrate flags.
  - Error: `#DC2626` (Red 600) for broken audio streams, sync failures, and destructive operations.

## Typography
Inter delivers functional neutrality and clear legibility at compact sizes. The scale relies on tight tracking across large display headings and neutral spacing on body copy. Numerical metadata, such as time elapsed (`04:12`), remaining time (`-32:45`), sample rates (`48kHz`), and bitrates (`320kbps`), must always use tabular figures (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during audio scrubbing and dynamic counter updates.

## Layout & Spacing
The layout follows a fluid 12-column grid system on desktop, adjusting to 8 columns on tablet and 4 columns on mobile:
- **Desktop (1024px and above)**: Outer margin is `margin` (2rem / 32px), with column gutters set to `gutter` (1.5rem / 24px). Sidebar navigation remains anchored at 280px fixed width, with the primary audio catalog fluidly spanning remaining space.
- **Tablet (768px - 1023px)**: Outer margin shrinks to 1.5rem (24px), gutters reduce to 1rem (16px). Audio cards stack into 2-column modules.
- **Mobile (Below 768px)**: Canvas margins set to `margin-sm` (1rem / 16px). Single-column card flows dominate, with sticky elements yielding to a persistent bottom audio deck and navigation bar.

Spacing tokens follow a strict 4px base increment (`0.25rem` to `2rem`). Padding inside dense audio rows utilizes `space-sm` (8px vertical) by `space-md` (16px horizontal) to preserve row density, while card interiors standardize on `space-lg` (24px) for breathing room.

## Elevation & Depth
Elevation is maintained using crisp structural boundaries (`1px solid #E2E8F0`) augmented by soft, highly diffused ambient drop shadows. Heavy contrasts, pure black drops, and neon glow rings are excluded.

- **Level 0 (Flat / Canvas)**: Applied to `#F8FAFC` background surfaces. No shadow.
- **Level 1 (Surface / Low)**: Applied to Audio Cards, Episode Lists, and Table Rows. Defined by `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`, encased in a `#E2E8F0` border.
- **Level 2 (Hover / Floating Controls)**: Applied to interactive states, active cards, dropdown menus, and the persistent Mini Player. Defined by `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Sticky / Full Player Deck)**: Applied to the fixed Bottom Player Deck and Sticky Header. Defined by `box-shadow: 0 -4px 12px 0 rgba(15, 23, 42, 0.06)`.
- **Level 4 (Modal Overlay / Dialog)**: Applied to Management Modals and Sheet drawers. Defined by `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes
The system relies on restrained, geometric curvature avoiding exaggerated pill containers. The default roundedness is `roundedness: 2`:
- Standard controls, text fields, checkboxes, list items, and table elements take `rounded-md` (8px).
- Structural units, audio album covers, audio cards, and management cards take `rounded-lg` (12px to 14px).
- Modals, large player drawers, and floating mini players use `rounded-xl` (14px to 16px).
- Pure circular forms (`rounded-full`) are strictly reserved for symmetrical control actions: Play/Pause trigger rings, scrubber thumbs, user avatars, and status icon badges.

## Components

### Buttons
- **Primary**: Solid `#7C3AED` background, `#FFFFFF` text, 8px border-radius. Active hover drops to `#6D28D9`. 
- **Secondary**: `#FFFFFF` surface with `#E2E8F0` border, `#111827` text. Hover background shifts to `#F1F5F9`.
- **Ghost/Tertiary**: Transparent background, `#64748B` text; hover state utilizes `#F1F5F9` background and `#111827` text.
- **Audio Control Button**: Circular, centered icon container. The main Play/Pause button uses `#7C3AED` (44px diameter), while Skip/Rewind/Shuffle buttons use secondary ghost stylings (36px diameter).

### Input Fields & Controls
- **Inputs**: Solid `#FFFFFF` fill, 1px `#E2E8F0` border, 8px radius, padded with 10px 14px. Focus state triggers a 1px `#7C3AED` ring with `0 0 0 3px rgba(124, 58, 237, 0.15)`.
- **Checkboxes & Radios**: 18px square (or circle), `#FFFFFF` fill, `#E2E8F0` border. Checked state transitions to `#7C3AED` background with crisp white iconography.

### Audio Cards & Management Cards
- **Audio Card**: `#FFFFFF` background, 1px `#E2E8F0` border, 12px corner radius. Features artwork container (aspect ratio 1:1, 8px radius), track title in `title-md` (`#111827`), secondary metadata (artist, audio length) in `body-sm` (`#64748B`). Includes quick hover action button that fades in.
- **Management Card**: Dense operational layout with `#F1F5F9` nested metadata pill clusters, usage metrics, track permissions, and direct contextual menus.

### Episode Lists & Tables
- **Episode List**: Vertical stacked rows on `#FFFFFF`. Padding: 12px 16px. Border bottom: 1px `#E2E8F0`. Hover state triggers background change to `#F8FAFC`. Displays track index, play trigger, title, release date, duration, and trailing icon menu.
- **Tables**: Header uses `#F1F5F9` background with uppercase `label-sm` text in `#64748B`. Row borders are 1px `#E2E8F0`. Active row highlights with an ultra-light tint (`rgba(124, 58, 237, 0.04)`) and left-anchored 3px `#7C3AED` border accent.

### Audio Player & Mini Player
- **Main Persistent Player**: Docked at bottom viewport. Height: 80px. Background `#FFFFFF`, top border 1px `#E2E8F0`, Level 3 elevation. Three-column layout:
  - Left: Cover art (48px), track title, artist name.
  - Center: Master controls (Shuffle, Prev, Play/Pause toggle, Next, Repeat) and full-width progress slider with `#7C3AED` active fill, `#F1F5F9` track buffer, and tabular duration indicators.
  - Right: Volume slider, output selector, and queue expander.
- **Mini Player**: Detached floating module (340px width, 64px height) docked 16px above bottom screen bounds. Background `#FFFFFF`, 14px radius, 1px `#E2E8F0` border, Level 2 elevation. Contains compact thumbnail, condensed scrolling marquee title, miniature play/pause toggle, and dismissal trigger.

### Badges, Tabs & Mobile Bottom Navigation
- **Badges**: 6px padding horizontal, 2px vertical, 6px radius. Font: `label-sm`. Success (`#16A34A` text on `rgba(22, 163, 74, 0.1)`), Explicit/Warning (`#F59E0B` text on `rgba(245, 158, 11, 0.1)`), Category/Neutral (`#64748B` text on `#F1F5F9`).
- **Tabs**: Segmented bar or underline style. Active tab renders with `#7C3AED` text and 2px `#7C3AED` bottom active indicator bar. Inactive tabs render in `#64748B` transitioning to `#111827` on hover.
- **Modals**: Centered overlays on `rgba(17, 24, 39, 0.4)` backdrop. Main body uses `#FFFFFF`, 14px radius, Level 4 elevation, and fixed 24px padding with dedicated action bar.
- **Bottom Navigation (Mobile)**: Fixed bottom bar, 60px height. Active route icon and label render in `#7C3AED`; inactive routes in `#64748B`. Rests cleanly directly below or integrated with the compact mobile audio drawer.