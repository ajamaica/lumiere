/**
 * Shared fetch with retry logic for network errors and rate limits
 */

const MAX_RETRIES = 3
const INITIAL_DELAY = 5000 // 5 seconds

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch with automatic retry for network errors and rate limits (429)
 *
 * Design principles:
 * - No HTTP timeout: Let server control (video generation can take 10+ minutes)
 * - Retry on: Network errors (TypeError: fetch failed), 429 rate limit
 * - Don't retry: 4xx client errors (except 429), 5xx server errors (server has retry)
 *
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Response>} The fetch response
 */
async function fetchWithRetry(url, options = {}, maxRetries = MAX_RETRIES) {
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Handle rate limit (429)
      if (response.status === 429) {
        if (attempt >= maxRetries) {
          return response // Return the 429 response on final attempt
        }

        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_DELAY * attempt
        console.log(
          `Rate limited. Waiting ${delay / 1000}s before retry ${attempt}/${maxRetries}...`,
        )
        await sleep(delay)
        continue
      }

      // Return response for all other status codes (let caller handle errors)
      return response
    } catch (error) {
      lastError = error

      // Only retry on network errors (TypeError: fetch failed)
      if (attempt < maxRetries) {
        const delay = INITIAL_DELAY * attempt
        console.log(
          `Network error: ${error.message}. Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`,
        )
        await sleep(delay)
      }
    }
  }

  throw lastError
}

module.exports = { fetchWithRetry, sleep }
