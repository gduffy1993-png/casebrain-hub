# AI Environment Variables Checklist

## Required Environment Variables

| Variable Name | Description | Used By |
|---------------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key (starts with `sk-...`) | All AI features |

## Optional Environment Variables (with defaults)

| Variable Name | Default Value | Description | Used By |
|---------------|---------------|-------------|---------|
| `OPENAI_EXTRACTION_MODEL` | `gpt-4o-mini` | Model for extracting case facts from documents | Document extraction, Upload |
| `OPENAI_LETTER_MODEL` | `gpt-4-turbo` | Model for generating letter drafts | Letter drafting, Auto-reply |
| `OPENAI_SUMMARY_MODEL` | `gpt-4o-mini` | Model for document summaries and briefings | Document summaries, Daily briefing |
| `CASEBRAIN_INTAKE_API_KEY` | (none) | API key for email intake authentication (external integrations) | Email intake, Outlook intake |
| `CASEBRAIN_DEFAULT_ORG_ID` | (none) | Default organization ID for API key auth | Email intake, Outlook intake |
| `CASEBRAIN_SYSTEM_USER_ID` | `system` or `outlook-addon` | System user ID for API key auth | Email intake, Outlook intake |
| `USE_AI_STRATEGY_SUGGESTIONS` | (unset/false) | When `true`, enables AI strategy suggestion (Option 3). Leave unset or false until ready. | `/api/criminal/strategy-suggest` (Phase 2) |

## Routes/Panels That Depend on AI

### Core AI Features
- **`/api/extract`** - Document extraction → uses `OPENAI_EXTRACTION_MODEL` + `OPENAI_SUMMARY_MODEL`
- **`/api/upload`** - File upload with extraction → uses `OPENAI_EXTRACTION_MODEL` + `OPENAI_SUMMARY_MODEL`
- **`/api/letter`** - Letter drafting → uses `OPENAI_LETTER_MODEL`

### Advanced Features
- **`/api/briefing`** - Daily team briefing → uses `OPENAI_SUMMARY_MODEL`
- **`/api/cases/[caseId]/documents/[documentId]/redflags`** - Red-flag clause detection → uses `gpt-4o-mini` (hardcoded)
- **`/api/cases/[caseId]/hearing-prep`** - Hearing preparation pack → uses `gpt-4o-mini` (hardcoded)
- **`/api/inbox/import`** - Email import with summarization → uses `OPENAI_SUMMARY_MODEL`

### Semantic Search (uses embeddings)
- **`/api/search/semantic`** - Semantic search across cases → uses `text-embedding-ada-002` (hardcoded)

### External Intake (optional)
- **`/api/intake/email`** - Email intake endpoint → requires `CASEBRAIN_INTAKE_API_KEY` (if using API key auth)
- **`/api/intake/outlook`** - Outlook add-in endpoint → requires `CASEBRAIN_INTAKE_API_KEY` (if using API key auth)

## Routes/Panels That DO NOT Use AI

These routes work without AI configuration:
- **`/api/cases/[caseId]/insights`** - Just aggregates existing data (no AI)
- **`/api/cases/[caseId]/supervisor-review`** - Database operations only (no AI)
- **`/api/cases/[caseId]/outcome-insights`** - Data aggregation only (no AI)
- **`/api/cases/[caseId]/instructions`** - Aggregates from other brains (may indirectly use AI if those brains do)

## Example .env.local

```bash
# ============================================================================
# REQUIRED: OpenAI Configuration
# ============================================================================
OPENAI_API_KEY=sk-proj-your-actual-openai-api-key-here

# ============================================================================
# OPTIONAL: OpenAI Model Overrides (if you want different models)
# ============================================================================
OPENAI_EXTRACTION_MODEL=gpt-4o-mini
OPENAI_LETTER_MODEL=gpt-4-turbo
OPENAI_SUMMARY_MODEL=gpt-4o-mini

# ============================================================================
# OPTIONAL: Email Intake API Key Authentication
# (Only needed if you're using external email gateways or Outlook add-in)
# ============================================================================
CASEBRAIN_INTAKE_API_KEY=your-secure-api-key-for-email-intake
CASEBRAIN_DEFAULT_ORG_ID=org_your-org-id-here
CASEBRAIN_SYSTEM_USER_ID=system
```

## Notes

1. **`OPENAI_API_KEY` is required** - Without it, all AI features will fail (extraction, letter drafting, summaries, etc.)

2. **Model defaults are sensible** - You can skip setting the model env vars if you're happy with the defaults:
   - `gpt-4o-mini` for extraction/summaries (fast, cheap)
   - `gpt-4-turbo` for letter drafting (better quality)

3. **Insights and Supervisor Review don't need AI** - These panels work with just database data, so they'll function even without `OPENAI_API_KEY`.

4. **Semantic search uses hardcoded embedding model** - Uses `text-embedding-ada-002` directly (not configurable via env var).

5. **Some features use hardcoded models** - Red-flag detection and hearing prep use `gpt-4o-mini` directly instead of env vars.

