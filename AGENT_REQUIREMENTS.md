# Active conversation requirements

Updated from the user's 15 October 2026 instructions. These supersede the earlier fixed tone selector and permanent chat-column design.

1. Keep the existing homepage, photos, show data and working links. Use a bottom-right floating launcher and minimisable chat window on desktop and mobile.
2. Show the chatbot name and a numbered 0–10 Scale of Akash Gupta, default 8, with an original smiling illustration. Slider changes affect subsequent responses without restarting the conversation.
3. `/admin` contains Persona, Tone, Empathy Stages, Happy Paths and Scope. Owner-editable scale bands and scope instructions apply to live replies and unsaved preview. Preserve existing configuration and the 5,000-word persona/tone limits.
4. Use original observational humour and broad conversational energy; never impersonate Aakash or reproduce performances. Match explicit language, understand Hinglish/typos, answer first, keep context, ask only necessary questions and avoid insults or aggressive responses.
5. All five empathy stages remain editable, including nonoverlapping ranges, context, behaviour, humour allowance and combined user/agent example. Select empathy dynamically. Stress and distress override humour and prevent automatic event-listing detours.
6. Use one flexible entry/intent/fulfilment/resolution planner. City/date/price/video/booking intent can change without losing reusable preferences. Do not force each stage or repeat supplied questions.
7. Offer 2–4 contextual reply chips for useful available actions. Do not force chips after goodbye, refusal or intense distress, or suggest actions excluded by edited scope. Clicking a chip sends its message or opens the actual booking modal.
8. Stay Aakash-only. No information/opinions/comparisons about other comedians, politics or unrelated topics. For rival shows/tickets, show the supplied image first, then the scope refusal in the selected language. Preserve the exact requested Hinglish notice.
9. Use maintained facts and source records only. Do not invent verified shows, prices, availability, policies, links, payments or ticket confirmations. Event cards retain one demo label; ordinary prose need not repeatedly mention sample/fake/placeholder data. Authenticity questions and checkout must be honest.
10. Booking intent exposes Book Tickets. Prefill known event/city/date/count, validate details and email, show a review and Proceed to Checkout, then return to the existing conversation. Only successful atomic demo checkout creates a linked receipt. No real charge, ticket or email. Failed/cancelled checkout must never confirm.
11. Persist separate sessions, optional names/generated nicknames, UTC timestamps, messages, settings, planning context and demo receipts. Restore a tab's conversation after refresh; separate parallel/duplicated tabs. Keep owner-only transcript access and hashed session credentials.
12. Move the permanent AI/storage paragraph to `/privacy`; leave a small Privacy link. Protect credentials. Never transmit booking email to the language model.
13. Keep safe clickable links, concise replies and no long dashes. At most one necessary follow-up. Respect goodbye/nothing else and suppress later reminders. Minimized/hidden/busy chats never send idle prompts; playful scale levels retain exactly `Excuse me brother, kidhar?`.
14. After publishing, show the updated site in Chrome. Test the user's typo examples, scale differences, scope editing, empathy, chips, booking success/failure/cancellation, responsive layouts and refresh persistence.

The dataset has 20 illustrative records from the supplied Numbers workbook, dated 7 November 2026 through 10 April 2027. Source timezones and real ticket categories were not supplied. Demo pricing uses the listed starting price, clearly labelled in checkout; it is not a live quote.


## Editable reactions

Admin Reactions supports up to 30 ordered rules, enable/disable, preset triggers, literal keywords or AI-understood custom conditions. First eligible rule wins; otherwise continue the normal answer. Images precede dialogue and fulfilment, without replacing facts or scope notices. Text stays in the configured dialogue language. Reactions respect normal tone, serious distress, endings and declined recommendations; once-per-session and optional next-turn yes follow-ups persist in conversation state. The existing other-comedian image rule remains editable. Owner image upload/paste accepts PNG/JPEG/WebP/GIF up to 3 MB into R2; only local immutable image paths are accepted. Idle ticket reactions run after 30 seconds, only after show cards and before a conversation is resolved, and are recorded with transcript metadata.


Reaction delivery: image matching is independent of dialogue language; mismatched dialogue is omitted while its image is sent. Once-per-conversation tracking uses a rule content revision so edited or replaced images can show in the same session. Custom conditions are evaluated by a dedicated matcher on generated and direct answers. Admin preview shows per-rule skip reasons.

Hybrid tone: at playful levels preserve a brief friendly acknowledgement through factual show and booking fulfilment. Use natural varied bro in English, and Arey/yaar/bro in Hinglish. Low levels remain professional and distress reduces banter. Every new homepage conversation begins with the exact phrase Excuse me brother! Existing transcript history is preserved.
