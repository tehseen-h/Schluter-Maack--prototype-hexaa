# Fitting the templates onto a host project

The templates are written against a **semantic class contract**, not a specific palette.
Before writing any component, resolve every row below against what the host project already
has. Two failure modes to avoid, both of which look like the feature "works" until someone
looks at it:

- **Inventing a parallel design system.** If the project already defines an accent colour, a
  border colour, an ink scale — use those. A diagram page with its own private palette reads
  as bolted on.
- **Hardcoding a hex** because the token names didn't line up. Then dark mode silently breaks
  on this page only.

## Step 1 — find what exists

```
# Tailwind version and config style
cat package.json | grep -i tailwind
ls tailwind.config.*        # v3 has one; v4 usually does not

# where the tokens live
grep -rn "@theme\|--color-\|:root" src/*.css src/**/*.css

# helpers the project already has
grep -rn "clsx\|classnames\|\bcx\b" src/lib src/utils 2>/dev/null
cat package.json | grep -i "lucide\|heroicons\|phosphor\|react-icons"
```

## Step 2 — fill in the mapping

Every class on the left appears in the templates. Write the host's equivalent on the right,
then apply that substitution across all copied files. If the host has no equivalent, add the
token to the host's own token file (Step 3) rather than hardcoding a value in a component.

| Template class | Means | Host equivalent |
|---|---|---|
| `bg-bg` | page ground, behind the canvas | |
| `bg-surface` | card surface | |
| `bg-surface-2` | recessed surface (inputs, chips) | |
| `border-line` | default border | |
| `border-line-strong` | emphasised border | |
| `text-ink` | primary text | |
| `text-ink-2` | secondary text | |
| `text-ink-3` | tertiary / label text | |
| `bg-accent` `text-accent` | the one accent colour | |
| `bg-accent-soft` | accent tint for backgrounds | |
| `text-accent-ink` | readable text on an accent tint | |
| `text-on-accent` | readable text on solid accent | |
| `bg-theirs` `text-theirs` `bg-theirs-soft` | lane colour: not-ours / upstream | |
| `bg-human` `text-human` `bg-human-soft` | lane colour: human decision | |
| `text-medium` `bg-medium-soft` `border-medium` | the "assumption / unconfirmed" flag | |
| `text-high` `bg-high-soft` | destructive / severe | |
| `rounded-card` | card corner radius | |
| `shadow-panel` | resting card shadow | |
| `shadow-pop` | floating menu / note shadow | |
| `ease-smooth` | shared easing curve | |
| `animate-fade-up` | menus, toasts | |
| `animate-fade-right` | step cards revealing rightward | |
| `animate-slide-in` | detail panel entering | |
| `theme-t` | colour-transition-on-theme-change class | |
| `num` | tabular monospace figures | |
| `cx()` | classnames joiner | `clsx`? |
| icon components | `IconChevronRight` etc. | `lucide-react`? |

**Lane colours specifically.** Start from what the project already has rather than reaching for
new hues. Most projects have a status or category palette (`--color-st-*`, `--color-brass`,
severity families). The "ours" lane is the accent, an upstream/not-ours lane is usually the
project's neutral-gray status colour, and a human-decision lane maps well to a violet/purple
status colour if one exists. The assumption flag maps to an amber/brass token.

**Then check them as branch strokes, not just as bands — this is where reuse breaks.** A lane
colour does two different jobs: it fills a ~30px-tall solid header band, and it draws a ~2.5px
dashed branch line. Colours that separate cleanly in the first job can collapse into each other
in the second. On a real client build a dark navy and a steel grey were plainly distinct as
bands and **indistinguishable as thin dashed lines on a warm ground** — two branches going to
completely different places read as one.

So after mapping, do this:

1. Render the diagram, zoom to fit, and look at the longest, thinnest branch on screen.
2. If you have to trace a line to know where it goes, the colour has failed — regardless of what
   a contrast ratio says. Contrast against the *background* is not the same as separation from
   the *other branch colour*.
3. Brighten or shift one of the pair until they separate at stroke width.

**Branch colours are allowed to be their own token set.** If one value can't serve both jobs,
don't force it — the band has area and a solid fill doing the work, the branch has neither, and
the branch is the one that loses. Add e.g. `--color-branch-<lane>` alongside the band token and
let `colourFor()` read those. Keeping them identical is a nice-to-have; keeping the lines
readable is not.

Note that colour is only one of the cues — direction-coded dash rhythm, filled labels and the
conditional key do the rest. See "Branch readability" in SKILL.md.

## Step 3 — add only what's genuinely missing

### Tailwind v4 (CSS-first — no config file)

Tokens are declared in `@theme` and utilities are generated from the variable name, so
`--color-lane-human` gives you `bg-lane-human`, `text-lane-human`, `border-lane-human/45`.
Opacity modifiers work natively against full colour values — no `<alpha-value>` needed.

```css
@import "tailwindcss";

@theme {
  /* only what the project doesn't already have */
  --color-lane-human: #6e42c1;
  --color-lane-human-bg: #ece3f8;

  --radius-card: 10px;
  --ease-smooth: cubic-bezier(0.22, 0.61, 0.36, 1);

  --animate-fade-up: fade-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  --animate-fade-right: fade-right 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  --animate-slide-in: slide-in 0.24s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

/* dark overrides go on the same selector the project already uses (.dark, [data-theme], …) */
.dark {
  --color-lane-human: #b28cec;
  --color-lane-human-bg: #221a38;
}

@keyframes fade-up   { from { opacity: 0; transform: translateY(6px);   } to { opacity: 1; transform: none; } }
@keyframes fade-right{ from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
@keyframes slide-in  { from { opacity: 0; transform: translateX(16px);  } to { opacity: 1; transform: none; } }
```

Three v4-specific traps:

1. **`@theme` does not cascade into `.dark`.** Only the *light* values belong in `@theme`;
   dark values are plain custom-property overrides on the dark selector. Putting a second
   `@theme` block inside `.dark` does not work.
2. **Unlayered CSS beats layered CSS**, regardless of specificity. Tailwind v4 emits all its
   utilities inside `@layer`, so a bare rule like `.react-flow__edge-path { stroke: … }`
   written outside any layer will override *every* utility that targets the same property.
   Keep bare element/class overrides for third-party CSS as narrow as possible, and put
   anything that should be overridable inside `@layer base { … }`.
3. **`--animate-*` needs the matching `@keyframes` at top level**, outside `@theme`.

### Tailwind v3 (config file)

Use [tokens.template.css](tokens.template.css) (RGB-triplet tokens) plus
[tailwind.config.snippet.js](tailwind.config.snippet.js) (`theme.extend.colors` consuming them
as `rgb(var(--x) / <alpha-value>)`), and set `darkMode: 'class'`.

## Step 4 — React Flow's own stylesheet

Two things regardless of Tailwind version:

- `import '@xyflow/react/dist/style.css'` **once**, at the top of the flow page component, so
  it loads before the project's overrides.
- Edge strokes and marker colours are SVG attributes set from JS, not CSS classes — they can't
  use utilities. The templates read them through the `cssVar()` helper in
  `FlowPage.template.tsx`, which handles both an `R G B` triple and a complete colour value.
  Point it at whichever token names the host actually uses.

## Step 5 — verify the mapping, don't assume it

After substituting, grep the copied files for anything left unmapped:

```
grep -rnE "#[0-9a-fA-F]{6}|rgb\(|text-white|bg-white|text-gray|bg-slate" src/pages/Flow* src/components/flow* src/lib/flow*
```

Two legitimate exceptions to that grep: the `cssVar()` fallback arguments (they only apply if
a token is missing entirely), and `bg-white/25`-style overlays sitting on a solid accent band,
where a literal translucent white is the intent. Everything else it finds is a bug.

Then run the host's own checks (`npm run typecheck`, `npm run build`) and the browser
verification checklist in SKILL.md. Type-checking clean is not the same as looking right.
