# Importing history from other AI tools

Bring your past conversations from ChatGPT, Claude and Gemini into memory so Ask, the brain and the semantic graph can use them. This is **export-based only**: the app cannot pull live from those products. You export a file from each one and import it here.

## Export from each tool

**ChatGPT.** Settings, Data controls, Export data, Confirm. You get an email with a zip. Upload the zip as is (the app reads only `conversations*.json` from it) or upload `conversations.json` directly.

**Claude.** Settings, Privacy, Export data. You get an email with a zip. Upload the zip or its `conversations.json`.

**Gemini.** Go to Google Takeout, deselect everything, select **My Activity**, then under its options choose **Gemini Apps** and set the format to **JSON**. Upload the zip or `MyActivity.json`. This one is best effort: Takeout has no conversation ids and the shape is not documented, so prompts are grouped into one conversation per day, and entries that are not prompts are skipped.

**Pasted transcript or Markdown/text file.** Paste a chat copied from any tool, or upload a `.md`/`.txt`. Lines that start with `You:`, `User:`, `Human:`, `ChatGPT:`, `Assistant:`, `Claude:`, `Gemini:` (also `**User:**` or `## Assistant`) become turns. Text with no labels is kept as one note.

**Memory list.** One fact per line, bullets and numbering are stripped. Use this for ChatGPT saved Memories (**they are not in the export JSON**: Settings, Personalization, Manage memories, copy the list) and for Claude's memory text.

## What the importer does

1. Reads and parses the file **in your browser** (File API). Zips are opened with the browser's built-in decompression, only the needed JSON files are inflated, so a multi-GB export with images is fine. Nothing is uploaded except text.
2. Walks ChatGPT's message tree from `current_node` back to the root, so only the final linear conversation is kept, not abandoned branches.
3. Drops system and tool messages, skips attachments and images (counted and shown), ignores unknown fields, and tolerates missing timestamps.
4. Splits long conversations into windows of about 3,500 characters with about 400 characters of overlap so embeddings stay focused.
5. Sends the conversations to `POST /api/import/ai-chats` in chunks of about 600 KB (Vercel request bodies are limited to roughly 4.5 MB). Admin only.

You always see a **preview first** (`mode: dry-run`): conversations, messages, memory items that would be created, items already imported, and what was skipped. Nothing is written until you press the import button, which sends `mode: commit` with `confirm: true`; the server refuses a commit without it.

## Privacy defaults

- Every imported item has `is_public = false` and `metadata.visibility = "private"`. Imported chats never ground the public Ask chat unless you curate an item public yourself.
- Sensitivity stays `normal` (not `restricted`), because `restricted` packets are never embedded and would be unsearchable. Privacy comes from `is_public = false`.
- Items are tagged with source `import:chatgpt`, `import:claude`, `import:gemini`, `import:transcript` or `import:memory-list`, and carry the import id, so an import can be found or removed as a group.
- Original timestamps are kept as the item's `event_time`. If an export has none, the import time is used and `metadata.time_is_original` is `false`. `ingestion_time` is when you imported.
- The provenance ledger gets one `memory_packet` entry per item. Its `aiLikelihood` is the share of characters the assistant wrote in that conversation (low confidence), with signals `kind: ai_chat_import`, the import id, the source and message counts.

## Idempotent re-import

Each item's hash is the SHA-256 of source, the export's own conversation id, window index and window text. It does not depend on import time or import id. Uploading the same export again (even weeks later) creates **zero** duplicates, and a failed import can be resumed: re-send or resume, finished chunks are skipped. If you add messages to a conversation and re-export, the changed windows are new items; older ones stay.

## Limits and cost safety

- **Cap per import:** 2,000 items by default (`AI_IMPORT_MAX_PACKETS` overrides). Conversations are sent newest first so the cap keeps the most recent history; the preview and the result tell you how many were left out, and you can run the import again later to add more.
- **Chunks:** at most 200 conversations and about 900 KB per request; the browser sends about 600 KB.
- **Embedding is not done in the request.** Items land `embedding_status = pending` at priority **low**. The embedding, L2 and L2.5 workers order by priority, so new notes (medium) go ahead of imported history, and the existing back-off and retry limits apply. Imports never call the embedder or the LLM themselves. Note that the worker orders priority as a string, and `low` sorts after `medium`, which is what makes this work; do not rename priorities.
- Conversations larger than about 600 KB each are skipped and counted.
- Very large JSON files (over 300 MB) are refused in the browser; upload the zip instead.

## Honest limits

- No live sync: you must export and import again to refresh.
- ChatGPT saved Memories and custom instructions are not in the export JSON; use the memory list paste.
- Gemini import is best effort (per-day grouping, replies may be missing if Takeout omitted them).
- Images, files, voice and tool outputs are not imported, only counted.
- Edited or regenerated ChatGPT replies on abandoned branches are not imported.
- Parsers were built from the documented and commonly seen export shapes and tested with realistic fixtures, not with your real export. Exports change; if a file is rejected, the preview shows why and nothing is written.
