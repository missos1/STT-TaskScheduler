// Backend address (FastAPI, see api_contract_and_roadmap.md §3).
export const API_BASE_URL = 'http://localhost:8000'

// true  -> read fake data from src/mocks (no backend needed)
// false -> call the real FastAPI server at API_BASE_URL
export const USE_MOCK = true

// How often to re-check GET /summary while the LLM is still processing.
export const POLL_INTERVAL_MS = 3000
