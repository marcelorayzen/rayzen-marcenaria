---
name: Rayzen Marcenaria
description: A local counter demonstrator that keeps editable dimensions, geometry, and revision data in view.
colors:
  ink: "#24292c"
  neutral-bg: "#e8e9e5"
  paper: "#f7f7f3"
  line: "#dedfd9"
  muted: "#59635f"
  accent: "#c74e39"
  accent-deep: "#9f3829"
  navy: "#25333d"
  focus: "#2f627a"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(24px, 2.25vw, 31px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  label:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
    fontSize: "9px"
    fontWeight: 500
    letterSpacing: "0.07em"
  measurement:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
    fontSize: "20px"
    fontWeight: 500
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    height: "39px"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "#f6f7f3"
    textColor: "#394344"
    height: "32px"
    padding: "0 10px"
  input-dimension:
    backgroundColor: "transparent"
    textColor: "#202729"
    typography: "{typography.measurement}"
  card-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
---

# Design System: Rayzen Marcenaria

## Overview

**Creative North Star: "The Revision Ticket and Departures Board"**

The interface turns a counter edit into a legible shop-floor record: measured values, one geometric model, a parts list, and a clearly numbered saved revision. A segmented revision ticket and compact technical indexing give the work a procedural, record-like character without implying transportation or scanning functionality.

The shipped visual language is precise and paper-like: a cool grey-green canvas, pale work surfaces, hairline dividers, dark ink, and a restrained coral signal. The project is explicitly a local demonstration; revision and model references carry `DEMO` identifiers rather than suggesting synchronization or a production system.

**Key Characteristics:**
- Project identity, demonstration status, and saved revision remain visible together.
- Dimensions and parts use stable, tabular-looking numeric presentation.
- Coral marks meaningful changed, selected, or validation states only.
- At mobile widths, editable dimensions precede the model and its readouts.

## Colors

The palette pairs cool, low-chroma work surfaces and technical ink with one restrained coral state color; rendered MDF tones belong to the geometry, not the reusable interface palette.

### Primary
- **Workshop Coral**: reserved for changed, selected, draft, and validation feedback.

### Neutral
- **Graphite Ink**: primary text and numeric values.
- **Bench Grey**: the page canvas around the work surfaces.
- **Drawing Paper**: the principal panel surface.
- **Hairline**: dividers and understated panel boundaries.
- **Instrument Grey**: secondary labels and supporting information.
- **Deep Counterweight**: the save action's dark blue-grey surface.
- **Deep Coral**: stronger text for changed or invalid states.
- **Inspection Blue**: visible keyboard focus.
- **Chalk White**: text on the save action.

### Named Rules
**The Change Signal Rule.** Coral is reserved for meaningful changed, selected, or validation states; it is not an always-on decorative accent.

## Typography

**Display Font:** Self-hosted Barlow Condensed (with sans-serif fallback)

**Body Font:** Segoe UI (with Helvetica Neue, Arial, sans-serif fallbacks)

**Label/Mono Font:** Cascadia Code (with SFMono-Regular, Consolas, monospace fallbacks)

**Character:** Condensed Barlow headings give the project and panel titles a compact workshop character. Segoe UI keeps instructions and controls familiar, while monospace labels and tabular figures make measurements, revision identifiers, and technical indexing easy to compare.

### Hierarchy
- **Display** (600 weight, responsive): the project title.
- **Headline** (600 weight): panel and section titles.
- **Body** (regular, compact): field labels, explanatory text, and controls.
- **Label** (500 weight, tracked monospace): axis codes, units, table headings, and metadata.
- **Measurements** (500 weight, tabular monospace): editable dimension values, readouts, quantities, and revision identifiers.

### Named Rules
**The Stable Figure Rule.** Keep dimensions, counts, and revision identifiers in tabular numeric presentation so changing values remain easy to scan.

## Layout

The desktop workspace centers within a 1440px page and pairs a narrower specification panel with the larger model panel; the parts table spans below. Header and page gutters respond to viewport width, while compact gaps and repeated fine separators keep the data dense but grouped.

At narrow widths, preserve the project and revision context, then place the editable specification panel before the model and its dimension rail, followed by the parts list. Keep the three axis readouts together. The parts table retains a readable minimum width and scrolls horizontally rather than compressing its columns.

### Named Rules
**The Specification-First Mobile Rule.** On mobile, editable dimensions come before the model; do not reverse that sequence.

## Elevation & Depth

Major panels use a shared, soft ambient shadow over the darker canvas. Fine borders and tonal surface shifts do most of the separation work; the drafting grid and the model's own geometry and lighting provide depth inside the drawing area.

### Shadow Vocabulary
- **Panel Lift** (`0 8px 26px rgb(34 40 43 / 7%)`): shared low-contrast elevation for the specification panel, model panel, and parts section.

### Named Rules
**The Paper-First Rule.** Use tonal surfaces and fine borders for structure; reserve the soft shadow for major work panels rather than small controls.

## Shapes

The interface uses square-cornered panels and controls with fine rectangular borders. The revision ticket's perforation and circular cutouts are a local silhouette; small circles also identify status and draft markers rather than rounding every surface.

## Components

### Buttons
- **Character:** quiet, rectangular controls with clear availability states.
- **Primary:** the full-width save action uses the dark blue-grey fill, white text, a fine border, and a 39px minimum height; its save mark is a drawn inline SVG.
- **Secondary:** CSV export uses a pale surface, neutral border, and compact 32px minimum height with a drawn download icon.
- **Hover / Focus:** hover shifts neutral surfaces or darkens the primary control; keyboard focus uses a visible blue outline.
- **Disabled:** muted fill and text plus a not-allowed cursor indicate unavailable save or export actions.

### Cards / Containers
- **Corner Style:** square corners with fine neutral borders.
- **Background:** pale drawing-paper surfaces against the grey-green canvas.
- **Shadow Strategy:** use the shared panel lift described in Elevation & Depth.
- **Internal Padding:** compact, panel-specific insets; the specification panel uses 20px horizontal padding at its desktop width.

### Inputs / Fields
- **Style:** transparent numeric inputs sit within axis-labelled, ruled fields; millimeter units remain adjacent to the value.
- **Focus:** the input receives a distinct blue outline.
- **Error / Disabled:** invalid dimensions and their messages use the stronger coral text; invalid values are not represented as a valid model.

### Signature Component: Revision Ticket
The ticket segments the current saved revision from a decorative `DEMO-R` reference strip. Its border and status respond to changed or invalid project state; the reference bars are visual identification, not a scannable code.

### Signature Component: Dimension Rail
Three equal readouts sit directly below the model. Each pairs a boxed X/Y/Z marker with a compact label and tabular value; keep the sequence and shared baseline intact.

### Signature Component: Material Indicator
The MDF indicator is a flat neutral swatch beside its thickness control. Keep this product-specific cue flat; it is not a general palette token or a textured wood sample.

### View Switcher
The four model views form a compact, bordered segmented control. Neutral hover feedback and a dark underline identify the active view.

### Parts Table
Part rows use compact monospace codes and tabular numeric columns, separated by fine rules. Hover gives a neutral tint; selected rows use a pale coral tint and stronger text. At mobile widths the table remains horizontally scrollable.

## Do's and Don'ts

### Do:
- **Do** keep model dimensions, parts, and the saved revision visually associated.
- **Do** make the local demonstration and `DEMO` revision references explicit.
- **Do** use tabular figures for dimensions, counts, and revision identifiers.
- **Do** use coral only for meaningful changed, selected, or validation states.
- **Do** keep editable dimensions before the model at mobile widths.
- **Do** retain visible keyboard focus and clear disabled states.

### Don't:
- **Don't** imply that the reference strip can be scanned; it is decorative identification only.
- **Don't** present the local demonstration as synchronized, persisted, or production-released.
- **Don't** use coral as a persistent decorative color.
- **Don't** force the parts table's columns below their readable minimum; use horizontal overflow.
- **Don't** turn the one-off neutral MDF indicator or rendered model tones into reusable interface palette tokens.
