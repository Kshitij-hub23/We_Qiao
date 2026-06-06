# Components — Qiáo UI Library

Reusable React components for the Qiáo intake and results UI.

## Component Catalog

### MedListInput

**Purpose:** Chip/tag entry for Western or TCM medicine lists.

**Props:**
```typescript
{
  label: string              // "Western medicines" or "Chinese medicines (TCM)"
  hint?: string              // e.g., "e.g. warfarin"
  placeholder: string        // "Type a drug name…"
  accent: "brand" | "teal"   // Color scheme (blue for WM, teal for TCM)
  items: string[]            // Current medicine list
  onChange: (next: string[]) => void
}
```

**Behavior:**
- User types a medicine name and presses **Enter**, **comma**, or tabs away
- The input clears and the name is added to the list as a chip
- Click the **×** button on a chip to remove it
- Press **Backspace** on empty input to remove the last item
- Prevents duplicate entries (case-insensitive match)
- Strips whitespace from inputs

**Example:**
```tsx
const [western, setWestern] = useState<string[]>([]);
<MedListInput
  label="Western medicines"
  hint="e.g. warfarin"
  placeholder="Type a drug name…"
  accent="brand"
  items={western}
  onChange={setWestern}
/>
```

---

### ConflictCard

**Purpose:** Display a single detected drug-herb interaction.

**Props:**
```typescript
{
  conflict: ConflictDetail    // { western_drug, tcm_herb, severity, mechanism }
  index: number               // For stagger animation
}
```

**ConflictDetail shape:**
```typescript
{
  western_drug: string    // e.g., "warfarin"
  tcm_herb: string        // e.g., "danshen"
  severity: Severity      // "contraindicated" | "major" | "moderate" | "minor"
  mechanism: string       // Explanation of the interaction
}
```

**Display:**
- **Left accent bar** — Color-coded by severity (red/orange/yellow/green)
- **Drug + herb pair** — Side-by-side badges in brand (blue) and teal colors
- **Severity badge** — Top-right, with label and icon
- **Mechanism** — Free-text explanation below

**Stagger animation:** Slides in with 0.06s delay per card (creates cascade effect).

**Example:**
```tsx
<ConflictCard 
  conflict={{ 
    western_drug: "warfarin",
    tcm_herb: "danshen",
    severity: "major",
    mechanism: "Additive anticoagulant effect…"
  }}
  index={0}
/>
```

---

### SeverityBadge

**Purpose:** Color-coded severity indicator with label.

**Props:**
```typescript
{
  severity: Severity  // "contraindicated" | "major" | "moderate" | "minor"
}
```

**Display:**
- Badge with background color matching severity
- Severity label (e.g., "MAJOR", "CONTRAINDICATED")
- Used in ConflictCard and optionally elsewhere

**Severity colors:**
- `contraindicated` — Red (#dc2626)
- `major` — Orange (#ea580c)
- `moderate` — Amber (#d97706)
- `minor` — Green (#059669)

**Example:**
```tsx
<SeverityBadge severity="major" />
```

---

### Button

**Purpose:** Primary or secondary action button.

**Props:**
```typescript
{
  variant?: "primary" | "secondary" | "ghost"  // Default: "primary"
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}
```

**Variants:**
- `primary` — Filled, blue background, white text (default)
- `secondary` — Outlined, accent text, transparent background
- `ghost` — Minimal, no border or fill, underline on hover

**Example:**
```tsx
<Button onClick={runCheck} disabled={!canCheck}>
  Review & check →
</Button>

<Button variant="secondary" onClick={reset}>
  Check another patient
</Button>
```

---

### GlassCard

**Purpose:** Container with glassmorphism effect (frosted glass appearance).

**Props:**
```typescript
{
  strong?: boolean       // Stronger blur and opacity (default: false)
  className?: string     // Additional Tailwind classes for padding, gap, etc.
  children: React.ReactNode
}
```

**Display:**
- Backdrop blur effect
- Semi-transparent white background
- Rounded corners, subtle shadow
- `strong` variant: more prominent blur and darker background

**Example:**
```tsx
<GlassCard strong className="flex flex-col gap-6 p-6">
  <h2>Enter the medicines</h2>
  <MedListInput ... />
</GlassCard>
```

---

### LoadingState

**Purpose:** Show a loading spinner during conflict check.

**Props:** None

**Display:**
- Animated spinner
- "Checking for conflicts…" text
- Centered in a GlassCard

**Example:**
```tsx
{status === "loading" && <LoadingState />}
```

---

### EmptyState

**Purpose:** Show when no conflicts are found.

**Props:** None

**Display:**
- Checkmark icon
- "No conflicts found" message
- Encouragement to check another patient
- In a GlassCard

**Example:**
```tsx
{sorted.length === 0 && <EmptyState />}
```

---

### ErrorState

**Purpose:** Show error message with retry option.

**Props:**
```typescript
{
  message: string           // User-facing error message
  onRetry: () => void      // Retry button callback
}
```

**Display:**
- ⚠️ Icon
- Error message
- "Retry" button

**Example:**
```tsx
{status === "error" && (
  <ErrorState message={error} onRetry={runCheck} />
)}
```

---

### FileAttach

**Purpose:** File upload UI for prescription PDFs/images (future: OCR).

**Props:**
```typescript
{
  files: AttachedFile[]
  onChange: (files: AttachedFile[]) => void
}

type AttachedFile = {
  name: string
  size: number
  type: string
}
```

**Behavior:**
- Drag-and-drop or click to upload
- Shows list of attached files
- Click × to remove a file
- Currently stores files in state (future: sends to OCR endpoint)

**Example:**
```tsx
const [attachments, setAttachments] = useState<AttachedFile[]>([]);
<FileAttach files={attachments} onChange={setAttachments} />
```

---

## Design Principles

### Color System
- **Brand (blue):** Western medicines, primary actions
- **Teal:** TCM herbs, secondary accent
- **Severity colors:** Danger (red) to safe (green)
- **Ink (grayscale):** Text, backgrounds, borders

### Spacing
- Uses Tailwind spacing scale (0.25rem increments)
- Components define their own padding; parent controls gap
- 6-8px padding inside cards, 6px between sections

### Animations
- All transitions use Framer Motion with spring physics
- 0.28s duration for step transitions
- Stagger delays for list items (0.06s between)
- No animation on first mount (initial={false})

### Responsiveness
- Mobile-first: assume viewport is small
- `sm:` breakpoint (640px) for tablet adjustments
- Flex wrapping for buttons and lists
- Text sizes scale with viewport

## Composition Example

**Full intake → results flow:**
```tsx
// page.tsx
<main>
  <Header />
  <AnimatePresence mode="wait">
    {step === "intake" && (
      <GlassCard>
        <MedListInput ... /> {/* Western */}
        <MedListInput ... /> {/* TCM */}
        <FileAttach ... />
        <Button onClick={() => setStep("confirm")}>
          Review & check →
        </Button>
      </GlassCard>
    )}
    
    {step === "results" && (
      <>
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState ... />}
        {status === "success" && (
          <>
            {conflicts.length === 0 ? (
              <EmptyState />
            ) : (
              conflicts.map(c => <ConflictCard conflict={c} />)
            )}
          </>
        )}
      </>
    )}
  </AnimatePresence>
</main>
```

## Styling & Customization

All components use Tailwind CSS. To adjust styling:

1. **Colors:** Update `tailwind.config.ts` with new color tokens
2. **Spacing:** Use Tailwind's `gap`, `p`, `m` utilities on parent containers
3. **Typography:** Adjust `globals.css` for font sizes and weights
4. **Animations:** Modify Framer Motion props in component `<motion.*>` elements

## Testing

Each component should have:
- **Unit test:** Props validation, edge cases (empty lists, long text)
- **Visual test:** Snapshot or Chromatic for design consistency
- **Interaction test:** User actions (typing, clicking, drag-drop)

See `../docs/SETUP.md` for test runner setup.
