# Parallel Task Board

## [Workstream A] - Data & Backend (Running in Terminal 1)
- [x] **LMSYS Adapter:** Build the scraper for Chatbot Arena Elo scores.
- [x] **Data Verification:** Write a script to check for "Orphan Models" (models in DB with no pricing or no scores).
- [ ] **Webhooks:** (Optional) Set up a Slack/Discord notification when the ingestion pipeline finishes.

## [Workstream B] - Frontend & UX (Running in Terminal 2)
- [x] **Model Detail Pages:** Implement `/models/[slug]` with the radar charts and cost widgets.
- [x] **Compare Matrix:** Build the `/compare` page using a floating tray logic.
- [x] **Search Engine:** Enhance the Navbar search with fuzzy matching using the local DB.