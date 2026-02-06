# fal Model API Examples

Use these examples as templates. Always verify the exact input/output schema in the model's API tab or OpenAPI schema before finalizing the request.

## Base URLs (Model Endpoints)
- Queue (recommended): `https://queue.fal.run/{model_id}`
- Synchronous: `https://fal.run/{model_id}`
- WebSocket: `wss://ws.fal.run/{model_id}`
Note: The fal Model APIs do not use an `api.fal.ai` domain.

## Text-to-Image (SDK, JavaScript)
```javascript
import { fal } from "@fal-ai/client";

// Configure credentials once per process/session.
fal.config({ credentials: process.env.FAL_KEY });

const result = await fal.subscribe("fal-ai/flux/dev", {
  input: {
    prompt: "a cinematic portrait of a fox in a vintage suit",
  },
});

// Inspect result.data for image URLs (field names vary by model).
console.log(result.data);
```

## Text-to-Image (SDK, Python)
Use the Python tab in the Quickstart or Client Libraries docs for the exact snippet and imports.

## Image-to-Image (SDK, JavaScript)
### 1) Upload an image to get a URL
```javascript
import { fal } from "@fal-ai/client";

const file = new File([imageBytes], "input.png", { type: "image/png" });
const imageUrl = await fal.storage.upload(file);
```

### 2) Call an image-to-image model
```javascript
const result = await fal.subscribe("<image-to-image-model-id>", {
  input: {
    prompt: "convert to watercolor style",
    image_url: imageUrl,
  },
});

console.log(result.data);
```

## REST (Queue API, Text-to-Image)
```bash
curl -X POST "https://queue.fal.run/fal-ai/fast-sdxl" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a cat"}'
```
The response includes a `request_id` plus URLs for status and results.

## Source Docs
- https://docs.fal.ai/model-apis/quickstart
- https://docs.fal.ai/model-apis/guides/generate-images-from-text
- https://docs.fal.ai/examples/model-apis/generate-videos-from-image
- https://docs.fal.ai/model-apis/client
- https://docs.fal.ai/model-apis/model-endpoints
- https://docs.fal.ai/model-apis/model-endpoints/queue
