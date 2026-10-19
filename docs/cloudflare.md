# Aakash Gupta fan homepage

Existing Worker ESM site with a floating conversational guide, owner-only controls, timestamped transcripts and in-chat demo checkout. It uses the existing server-side OpenAI Responses connection; API secrets are never included in browser source.

## Chat and owner controls

The launcher opens a floating window. The 0–10 **Scale of Akash Gupta** defaults to 8, can change during a session, and controls original humour and conversational energy. Language remains independent. High empathy overrides humour. Minimise/reopen preserves the DOM; refresh restores the authenticated server transcript and tab preferences. Tab ownership checks separate duplicated tabs.

`/admin` has five editable sections: Persona, Tone, Empathy Stages, Happy Paths, Scope. Persona and Tone support 5,000 Unicode words each. Four editable scale bands, all five empathy stages/ranges/examples, four flexible happy-path stages and all three scope fields build the effective prompt on every turn. Preview uses unsaved settings without changing the live configuration. Existing configurations migrate without resetting owner text or examples. Older admin clients preserve added fields when saving.

Owner configuration persists in `BUCKET` (R2). `ADMIN_OWNER_EMAIL` protects the admin routes using the trusted Sites identity header. `/admin/sessions` lists, renames and exports stored transcripts. Scope, factual accuracy, political restrictions and identity boundaries remain enforced independently of the personality scale. Edited scope is checked separately before fulfilment and before demo checkout. Owner-excluded requests receive a grounded redirection instead of model-provided excluded facts/actions. If the scope check cannot complete, the action is withheld rather than assumed permitted.

## Demo booking

Booking intent provides **Book Tickets**. The modal prefills known city/date/count, selects a maintained event, collects email, and reviews a summary before **Proceed to Checkout**. Only available future listings may be selected. The listed starting price is explicitly used as a demo unit price; no unprovided real categories or prices are invented.

Checkout atomically saves a `demo_bookings` row, a linked chat receipt and updated session state in `DB` (D1). Request IDs make retries idempotent. Receipts explicitly say demo, no payment, no real ticket and no email sent. Invalid, failed or cancelled checkout never creates a successful confirmation. Email stays in the booking receipt and is not included in AI conversation input.

Real payments, real ticket issuance, booking-platform inventory, confirmed show feeds and confirmation email delivery need external integrations. The source dataset remains the 20 user-supplied illustrative records in `data/sample-shows.json`. Cards and checkout retain demo status without repeating implementation disclaimers in routine replies. Privacy information is at `/privacy`.

## Source and validation

- `worker/index.js`: existing pages, shared agent planner, settings, session APIs, demo booking and embedded supplied reaction image.
- `db/schema.ts`, `drizzle/`: append-only generated schema migrations. Sites applies the packaged migration bundle before deploying the Worker.
- `tests/`: request-level SQLite/D1 tests for settings, boundaries, context, recovery, isolation and checkout. Live AI and browser acceptance checks supplement these.

Run `npm test`, then `npm run build` and `npm run validate`. Publish using the Sites source workflow and retain the existing private audience.

Photo/bio: https://www.eastvillecomedy.com/comedians/aakash-gupta
Official links: https://linktr.ee/theskygupta
