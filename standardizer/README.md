# Standardizer — Medicine Name Normalization

The **fuzzy step** of Qiáo. Converts unstructured, free-text medicine input into canonical names the HDI database recognizes.

---

## What It Does

Takes messy patient prescription data:
```
"I take Coumadin 5mg daily, 丹参 tea, Advil as needed, and dong quai soup"
```

And normalizes it to exact database names:
```json
{
  "western_medicines": ["Warfarin", "Ibuprofen"],
  "eastern_medicines": ["Danshen", "Dong quai"]
}
```

**Key guarantee:** Every returned name is an exact match to a `preferred_name` in the HDI database. Nothing is invented, approximated, or close-enough.

---

## Architecture

The standardizer is the **LLM-backed fuzzy step** of the fuzzy-vs-deterministic split (see `../CLAUDE.md`, principle #2):

```
User input (messy)
       │
       ▼
┌──────────────────────────────────────────┐
│ LLM via KIT SCC Gateway                  │
│ (OpenAI-compatible API)                  │
│ - Recognizes medicine names              │
│ - Resolves synonyms, brands, synonyms    │
│ - Maps to controlled vocabulary          │
│ Temperature: 0 (deterministic)           │
│ Format: JSON only                        │
└──────────────┬───────────────────────────┘
               │
               ▼
Validation + snapping to DB exact spelling
               │
               ▼
┌──────────────────────────────┐
│ StandardizedMedicines        │
│ {                            │
│   "western_medicines": [...],│
│   "eastern_medicines": [...]│
│ }                            │
└──────────────┬───────────────┘
               │
               ▼
Ready to POST to HDI API
/api/v1/check-conflicts
```

**Note:** Uses the KIT SCC "ki-toolbox" gateway (OpenAI-compatible), not direct Gemini API.

---

## Controlled Vocabulary

The LLM is **constrained to choose only from a fixed list** of medicines:

```python
DATABASE_MEDICINES = {
    "western_medicines": [
        "Warfarin",
        "Aspirin",
        "Ibuprofen",
        ...
    ],
    "eastern_medicines": [
        "Danshen",
        "Dong quai",
        "Ginkgo",
        ...
    ]
}
```

**Why this constraint?**

1. **Prevents hallucinations** — The LLM cannot invent medicines that don't exist
2. **Ensures DB match** — Every returned name is guaranteed to be in the HDI database
3. **Maintains safety** — The conflict engine only knows about these medicines; anything else would be ignored anyway
4. **Single source of truth** — When the database grows, update `DATABASE_MEDICINES` once; the LLM automatically learns it

---

## Usage

### From Python

```python
from standardizer.standardize import standardize_medicines

result = standardize_medicines("I take warfarin and danshen tea")
print(result.model_dump())
# {
#   "western_medicines": ["Warfarin"],
#   "eastern_medicines": ["Danshen"]
# }
```

### From Command Line

```bash
cd standardizer
echo "Coumadin 5mg, 丹参 formula, Advil as needed" | python standardize.py
```

Output:
```json
{
  "western_medicines": ["Warfarin", "Ibuprofen"],
  "eastern_medicines": ["Danshen"]
}
```

### From Next.js (Future)

```typescript
// Once a server endpoint exists:
const result = await fetch("/api/extraction/standardize", {
  method: "POST",
  body: JSON.stringify({ input: "Coumadin, 丹参 tea" })
});
const data = await result.json();
// { "western_medicines": ["Warfarin"], "eastern_medicines": ["Danshen"] }
```

---

## API Reference

### `standardize_medicines(user_input, *, client=None, model=MODEL) -> StandardizedMedicines`

Standardize free-text medication input into database-canonical names.

**Parameters:**

| Name | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `user_input` | str | Yes | — | Raw patient medication text (any language, any format) |
| `client` | OpenAI | No | None | Pre-built OpenAI client (for testing/reuse). If None, created from `OPENAI_API_KEY`. |
| `model` | str | No | `"azure.gpt-4.1-mini"` | Model ID at the KIT gateway |

**Returns:**

```python
StandardizedMedicines(
    western_medicines: List[str],    # Database-exact names
    eastern_medicines: List[str]     # Database-exact names
)
```

**Raises:**

- `ValueError` — If `OPENAI_API_KEY` is not set and no client is provided

**Behavior:**

- Empty input returns `StandardizedMedicines()` (empty lists) immediately without calling the LLM
- LLM response is validated; anything not in the controlled vocabulary is dropped
- Case-insensitive matching (input "warfarin" → DB "Warfarin")
- Deduplicates output (same medicine listed twice → returned once)
- Order is preserved

**Example:**

```python
from standardizer.standardize import standardize_medicines

# Messy input: brand names, Chinese, mixed languages, dosages
result = standardize_medicines(
    "Patient on Coumadin (warfarin) 5mg daily for AFib. "
    "Also taking 丹参 (danshen) tea from TCM clinic. "
    "OTC Advil 200mg as needed for headaches. "
    "And a dong quai formula from her grandmother."
)

print(result.western_medicines)  # ["Warfarin", "Ibuprofen"]
print(result.eastern_medicines)  # ["Danshen", "Dong quai"]

# Ready to send to the HDI API:
import httpx
conflicts = httpx.post(
    "http://127.0.0.1:8000/api/v1/check-conflicts",
    json=result.model_dump()
).json()
```

---

## Data Flow

### Input Resolution

The LLM resolves each input medicine through multiple pathways:

| Input | Type | Maps To | Notes |
|-------|------|---------|-------|
| `"Coumadin"` | Brand name | `"Warfarin"` | Recognizes proprietary names |
| `"warfarin"` | Generic (lowercase) | `"Warfarin"` | Case-insensitive |
| `"丹参"` | Chinese character | `"Danshen"` | Understands Chinese medicine names |
| `"danshen"` | Pinyin | `"Danshen"` | Pinyin romanization |
| `"red sage"` | English synonym | `"Danshen"` | Common English names |
| `"当归"` | Chinese character | `"Dong quai"` | TCM binomials |
| `"tang kuei"` | Pinyin variant | `"Dong quai"` | Alternative romanizations |
| `"gan cao"` | Pinyin | `"Licorice"` | Herb name normalization |
| `"unknown herb XYZ"` | Not in vocabulary | ✗ (dropped) | Rejected; safety net |

### Validation & Snapping

After the LLM returns JSON, a validation layer **snaps** the output to exact database spelling:

```python
# LLM returns (possibly with typos/variations):
{
  "western_medicines": ["warfarin", "IBUPROFEN"],
  "eastern_medicines": ["DANSHEN", "dong quai"]
}

# Validation snaps to DB exact spelling:
{
  "western_medicines": ["Warfarin", "Ibuprofen"],
  "eastern_medicines": ["Danshen", "Dong quai"]
}

# And drops anything not in the vocab:
# (If LLM somehow returned "Unknown Medicine Z", it's filtered out)
```

---

## System Prompt

The LLM operates under a detailed **system prompt** that:

1. **Explains the task:** Recognize medicines, map to the vocabulary
2. **Lists the vocabulary:** Every allowed medicine, grouped by WM/TCM
3. **Enforces constraints:**
   - Output only names from the vocabulary
   - Match spelling exactly
   - Never invent medicines
   - Ignore dosages, frequencies, routes
   - Deduplicate

The prompt is embedded in the module and uses `__VOCABULARY__` templating:

```python
SYSTEM_PROMPT = _SYSTEM_PROMPT_TEMPLATE.replace(
    "__VOCABULARY__",
    _format_vocabulary()  # Generates the list from DATABASE_MEDICINES
)
```

This means **when you update `DATABASE_MEDICINES`, the prompt automatically includes the new medicines** at module load time.

---

## Controlled Vocabulary Sync

The `DATABASE_MEDICINES` dict must stay in sync with the HDI database.

### Current vocab (mock data)

```
WESTERN: Warfarin, Aspirin, Clopidogrel, ... (24 items)
EASTERN: Danshen, Dong quai, Ginkgo, ... (22 items)
```

### Updating the vocab

When the real HDI dataset lands:

```bash
# 1. Query the HDI database for all preferred names
cd hdi-api
python -c "
from database import SessionLocal, Entity
db = SessionLocal()
west = [e.preferred_name for e in db.query(Entity).filter(Entity.type == 'WM-drug')]
east = [e.preferred_name for e in db.query(Entity).filter(Entity.type.like('TCM-%'))]
print('WESTERN:', sorted(west))
print('EASTERN:', sorted(east))
"

# 2. Update DATABASE_MEDICINES in standardizer/standardize.py
# 3. Commit and push
# 4. The LLM automatically learns the new vocab on next module import
```

### Why this matters

- If you add a new interaction (e.g., "Methotrexate × Angelica") to the HDI database, the LLM learns it automatically when `DATABASE_MEDICINES` is updated
- If you deploy a new dataset, the standardizer adapts without code changes
- If the LLM somehow returns a name not in the vocab, it's silently dropped (safety net)

---

## Robustness

The standardizer handles edge cases gracefully:

### Empty or whitespace input
```python
standardize_medicines("")
# → StandardizedMedicines() (empty lists, no LLM call)

standardize_medicines("   ")
# → StandardizedMedicines() (empty lists, no LLM call)
```

### Malformed LLM response
```python
# LLM returns something that's not JSON
# or has code fences: ```json {...}```
# → Parsed correctly; falls back to {} if it breaks
```

### LLM returns names not in vocab
```python
# LLM returns "Unknown Medicine Z"
# → Validated and filtered out (only DB names returned)
```

### Type errors
```python
# LLM returns western_medicines as a string instead of array
# → Converted to list or empty list
```

### Duplicates
```python
# LLM returns ["Warfarin", "Warfarin"]
# → Deduplicated to ["Warfarin"]
```

---

## Configuration

### API Gateway

The standardizer uses the **KIT SCC "ki-toolbox" gateway** — an OpenAI-compatible API that provides access to multiple LLMs (including Gemini via Azure) through a unified interface.

**Gateway:** `https://ki-toolbox.scc.kit.edu/api/v1`
**Model:** `azure.gpt-4.1-mini` (Gemini, via KIT SCC)

### Environment Variables

| Name | Required | Default | Notes |
|------|----------|---------|-------|
| `OPENAI_API_KEY` | Yes* | — | **KIT SCC token, not a raw Gemini/OpenAI key.** Request access at https://www.scc.kit.edu/ |
| `BASE_URL` | No (hardcoded) | `"https://ki-toolbox.scc.kit.edu/api/v1"` | KIT SCC OpenAI-compatible gateway. Can be overridden in code for testing. |
| `MODEL` | No (hardcoded) | `"azure.gpt-4.1-mini"` | Model ID at the KIT gateway. Can be overridden in function call. |

*Only required if calling `standardize_medicines()` without a pre-built client.

### .env Template

```bash
# .env (add to .gitignore)
# This is a KIT SCC token, obtained from https://www.scc.kit.edu/
OPENAI_API_KEY=your-kit-scc-token-here
```

### Getting Started

1. **Request KIT SCC access** at https://www.scc.kit.edu/
2. **Generate a token** in the KIT SCC dashboard
3. **Add to .env:** `OPENAI_API_KEY=<your-token>`
4. **Test it:**
   ```bash
   echo "Warfarin and danshen" | python standardize.py
   ```

---

## Testing

### Unit tests (manual examples)

```bash
cd standardizer

# Basic case
echo "Coumadin, danshen tea" | python standardize.py
# {"western_medicines": ["Warfarin"], "eastern_medicines": ["Danshen"]}

# Complex case (Chinese, synonyms, brand names)
echo "患者在服用香豆素类(warfarin/Coumadin) 5mg日一次，以及丹参茶" | python standardize.py
# {"western_medicines": ["Warfarin"], "eastern_medicines": ["Danshen"]}

# Empty input
echo "" | python standardize.py
# {"western_medicines": [], "eastern_medicines": []}

# Unknown medicine
echo "Unknown medicine XYZ" | python standardize.py
# {"western_medicines": [], "eastern_medicines": []}
```

### Python unit tests (not yet implemented)

```python
from standardizer.standardize import standardize_medicines

def test_basic():
    result = standardize_medicines("Warfarin")
    assert result.western_medicines == ["Warfarin"]
    assert result.eastern_medicines == []

def test_chinese():
    result = standardize_medicines("丹参")
    assert result.eastern_medicines == ["Danshen"]

def test_brand_name():
    result = standardize_medicines("Coumadin")
    assert result.western_medicines == ["Warfarin"]

def test_empty():
    result = standardize_medicines("")
    assert result.model_dump() == {"western_medicines": [], "eastern_medicines": []}

def test_unknown():
    result = standardize_medicines("Unknown Medicine Z")
    assert result.model_dump() == {"western_medicines": [], "eastern_medicines": []}

def test_duplicates():
    result = standardize_medicines("Warfarin Warfarin")
    assert result.western_medicines == ["Warfarin"]

def test_mixed():
    result = standardize_medicines("Coumadin (warfarin) and 丹参 danshen")
    assert result.western_medicines == ["Warfarin"]
    assert result.eastern_medicines == ["Danshen"]
```

---

## Integration with Qiáo

### Phase 1 (Current)

The standardizer is a **standalone Python module**. It's not yet integrated into the web app.

### Phase 2 (Next)

Create a Next.js API endpoint that calls the standardizer:

```typescript
// app/api/extraction/standardize/route.ts
export async function POST(request: Request) {
  const { input } = await request.json();
  
  // Call Python standardizer
  const result = await fetch("http://127.0.0.1:5000/standardize", {
    method: "POST",
    body: JSON.stringify({ input })
  });
  
  const standardized = await result.json();
  
  // Return to browser
  return NextResponse.json({ ok: true, ...standardized });
}
```

Or wrap it in a FastAPI service alongside the HDI API.

### Phase 2b (Alternative)

Expose the standardizer as a Python FastAPI endpoint:

```python
# hdi-api/extraction.py (new file)
from fastapi import APIRouter
from standardizer.standardize import standardize_medicines

router = APIRouter(prefix="/api/v1/extraction", tags=["extraction"])

@router.post("/standardize")
def standardize(input: str) -> StandardizedMedicines:
    return standardize_medicines(input)
```

Then the Next.js app calls it directly:

```typescript
// lib/standardizer.ts
export async function standardizeMedicines(input: string): Promise<StandardizedMedicines> {
  const res = await fetch(`${ENGINE_URL}/api/v1/extraction/standardize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input })
  });
  return res.json();
}
```

---

## Known Limitations & Considerations

### Operational
1. **Network required** — Requires active internet connection to KIT SCC gateway
2. **Latency** — LLM calls typically take 1-2 seconds (slower than local rule-based matching)
3. **Gateway dependency** — If KIT SCC gateway is down, standardizer cannot run
4. **Rate limits** — KIT SCC may have rate limits; large batch processing may be throttled

### LLM Behavior
5. **Occasional hallucinations** — LLM might output unexpected names despite constraints
   - Mitigated by validation layer (invalid names are dropped)
   - Temperature=0 makes it deterministic, but not infallible
6. **Non-deterministic fixes** — Same input may occasionally produce different outputs
   - Rare (temperature=0), but possible with prompt interpretation edge cases
   - Cache frequently-seen inputs if consistency is critical

### Coverage
7. **Language support** — Works best with English, Chinese characters, and pinyin
   - Other languages (Arabic, Cyrillic, etc.) untested
   - Mixed-language input usually works
8. **Medicine scope** — Limited to medicines in `DATABASE_MEDICINES` (46 items)
   - Grows with the HDI dataset
   - Unknown medicines are dropped (safety by design)

---

## Future Improvements

1. **Caching** — Cache common inputs (e.g., "Warfarin" → always returns ["Warfarin"])
2. **Batch processing** — Accept multiple prescriptions at once
3. **Confidence scores** — Return how confident the LLM is in each match
4. **Fallback mode** — If LLM fails, fall back to regex + fuzzy matching
5. **Dosage extraction** — Optionally extract and return dosages separately
6. **Drug interaction hints** — Suggest which medicines might interact (previewed before the full check)

---

## Files

| File | Purpose |
|------|---------|
| `standardize.py` | Main module with `standardize_medicines()` function |
| `README.md` | This file |

---

## Related Documentation

- `../CLAUDE.md` — Principles #2 (fuzzy vs. deterministic)
- `../docs/ARCHITECTURE.md` — System architecture; standardizer is the fuzzy step
- `../docs/API.md` — Future `/api/v1/extraction/standardize` endpoint
- `../docs/SETUP.md` — How to set `OPENAI_API_KEY`
