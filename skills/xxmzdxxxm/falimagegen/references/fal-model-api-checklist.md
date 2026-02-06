# Fal Model API Checklist

Use this checklist after opening the fal model API docs for the selected model.

## Model Selection
- Confirm the exact model ID or endpoint slug.
- Confirm whether the model supports text-to-image, image-to-image, or both.

## Inputs (Verify in Docs)
- Required fields and types (prompt, image, etc.).
- Optional fields (negative prompt, size/aspect, steps, seed, guidance, safety).
- Allowed ranges and constraints.

## Auth & Transport
- Required auth method (headers, SDK config, env vars).
- API base URL and endpoint path.
- Whether the call is synchronous or async/queued.

## Outputs
- Image URL field(s) and any nested structures.
- Additional metadata the user asked for (seed, width/height, model info).

## Error Handling
- Typical error fields in responses.
- Retry guidance and rate limit hints (if provided by docs).

## Return Format
- Provide a clean list of URL(s).
- If multiple outputs, label them consistently (e.g., 1..N).
