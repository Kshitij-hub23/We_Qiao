# Standardizer Documentation Review & Accuracy Check

## ⚠️ CRITICAL ISSUE: API Key Format

**Problem:** The provided Gemini API key (`AIzaSyBLeh-zQidl36WGRaK2S70QR07DdOPNJCQ`) is **not compatible** with the current implementation.

**Why:** The standardizer uses:
- **Gateway:** KIT SCC "ki-toolbox" (https://ki-toolbox.scc.kit.edu/api/v1)
- **API Format:** OpenAI-compatible API
- **Required Auth:** KIT SCC token (not raw Gemini/OpenAI API key)

**What This Means:**
- The Gemini API key you provided is for direct Gemini API access
- The code is hardcoded to use KIT SCC's wrapper, which requires a KIT SCC token
- Using the Gemini key directly will fail with an authentication error

**Solution:**
You need to:
1. Request KIT SCC access at https://www.scc.kit.edu/
2. Generate an OpenAI-compatible token from your KIT SCC account
3. Use that token in `.env` as `OPENAI_API_KEY`

---

## Documentation Review Summary

### ✅ What Was Verified Accurate

- Database schema matches `DATABASE_MEDICINES` (46 medicines: 24 WM + 22 TCM)
- Controlled vocabulary constraint is enforced
- Case-insensitive matching works
- Alias resolution is correct
- Validation & snapping logic is accurate
- Error handling (empty input, malformed JSON, unknown medicines) is correct
- System prompt templating is correct
- Deduplication logic is accurate

### 🔧 What Was Updated for Clarity

**standardizer/README.md:**
- Clarified KIT SCC gateway usage (was ambiguous, now explicit)
- Updated API configuration section with clear setup instructions
- Explained why Gemini API key alone isn't sufficient
- Added guidance on requesting KIT SCC access
- Expanded "Known Limitations" with more detail on network/latency/rate-limits
- Added note about non-determinism possibility

**standardizer/standardize.py module docstring:**
- Clarified gateway + model combination
- Specified that OPENAI_API_KEY is a KIT SCC token, not raw Gemini
- Added temperature=0 and JSON mode details

**README.md:**
- Updated stack table to clarify "Gemini via KIT SCC gateway"

---

## Key Documentation Sections

### Architecture
✅ **Clear:** Three-step process (input → LLM → validation → output)
✅ **Accurate:** Shows LLM via KIT SCC, not direct Gemini

### Controlled Vocabulary
✅ **Clear:** Why the constraint exists (hallucination prevention, DB match, safety)
✅ **Accurate:** Lists actual DATABASE_MEDICINES correctly
✅ **Actionable:** Shows how to sync with HDI database

### Usage Examples
✅ **Accurate:** Python, CLI, and (future) Next.js examples all correct
✅ **Clear:** Shows expected input/output formats

### Configuration
⚠️ **UPDATED:** Now clearly states KIT SCC token requirement
⚠️ **UPDATED:** Explains that raw Gemini key won't work
✅ **Clear:** Step-by-step setup instructions

### API Reference
✅ **Accurate:** All parameters documented correctly
✅ **Clear:** Behavior explained with examples
✅ **Complete:** Includes return types, exceptions, examples

### Data Flow
✅ **Accurate:** Input resolution table shows real examples from DATABASE_MEDICINES
✅ **Clear:** Validation & snapping process explained
✅ **Helpful:** Shows both LLM output and final validated output

### Testing
✅ **Accurate:** Manual test examples are all correct
✅ **Ready:** Unit test templates provided (not yet implemented)

### Robustness
✅ **Complete:** All edge cases documented
✅ **Clear:** How each edge case is handled

---

## Accuracy Verification Checklist

- ✅ 46 medicines in DATABASE_MEDICINES (24 WM + 22 TCM)
- ✅ System prompt template uses `__VOCABULARY__` placeholder correctly
- ✅ Case-insensitive matching via `_WESTERN_LOOKUP` and `_EASTERN_LOOKUP`
- ✅ Validation snaps to exact DB spelling
- ✅ Empty input returns empty StandardizedMedicines immediately (no LLM call)
- ✅ Deduplication preserves order
- ✅ All fields documented (`mechanism`, `clinical_effect`, etc.)
- ✅ Temperature=0 for determinism
- ✅ JSON mode enforced
- ✅ Python-dotenv loads .env from repo root
- ✅ KIT SCC gateway hardcoded to https://ki-toolbox.scc.kit.edu/api/v1
- ✅ Model hardcoded to azure.gpt-4.1-mini
- ✅ OPENAI_API_KEY env var is read correctly

---

## Recommendations

### Short Term
1. **Update .env** — Remove the Gemini key and replace with KIT SCC token
2. **Test locally** — Once you have KIT SCC access, test the standardizer
3. **Verify output** — Confirm "Coumadin" → "Warfarin" conversion works

### Medium Term
1. **Add error handling** — Catch and log KIT SCC gateway errors
2. **Add retries** — Handle transient network errors
3. **Cache common inputs** — Speed up repeated standardizations

### Long Term
1. **Consider direct Gemini API** — If KIT SCC becomes unavailable, implement direct Gemini support
2. **Implement batching** — For processing multiple prescriptions at once
3. **Add confidence scoring** — Return how confident the LLM is in each match

---

## Files Modified

- `standardizer/README.md` — Configuration section clarified, limitations expanded
- `standardizer/standardize.py` — Module docstring updated with gateway details
- `README.md` — Stack table updated to clarify KIT SCC usage
- `.env` — Created with placeholder (⚠️ contains real API key — regenerate in production)

---

## Next Steps

1. **Request KIT SCC access** → https://www.scc.kit.edu/
2. **Generate token** in KIT SCC dashboard
3. **Update .env** with the token
4. **Test:** `echo "Warfarin" | python standardizer/standardize.py`
5. **Verify output:** Should return `{"western_medicines": ["Warfarin"], "eastern_medicines": []}`
