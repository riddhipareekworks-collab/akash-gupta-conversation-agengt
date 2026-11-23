# Use Gemini instead of OpenAI

The application supports either provider. Selecting Gemini routes all four AI
operations (chat replies, scope decisions, custom reactions, reply variations)
to Google's OpenAI-compatible Chat Completions endpoint. The server translates
its existing structured response schema and saved conversation history. It does
not forward an OpenAI key to Google or fall back to a paid OpenAI request.

## Configure Vercel after deploying this change

1. Create a Gemini API key in https://aistudio.google.com/api-keys.
2. In the existing Vercel project's Environment Variables, add:

   - `AI_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: paste your private Google key yourself
   - `GEMINI_MODEL`: `gemini-3.5-flash-lite`

3. Apply these to Production and any Preview environment you test.
4. Save, then redeploy the newest version.
5. Test the chatbot and `/api/status`, and check that new messages appear in admin history.

Keep these credentials out of Git and browser code. A local `.env` has blank
Gemini placeholders; it does not configure Vercel. `OPENAI_API_KEY` is not required
when `AI_PROVIDER=gemini`. Preserve the database and admin settings as they are.
Changing only the API key without selecting the provider does not switch services.

The default model was chosen from Google's published free-tier pricing at the
time of this change. Actual availability and limits depend on your Google project;
free-tier quotas may interrupt replies. Do not enable billing just to complete
this setup if your intent is to remain on the free tier. Google's free-tier data
terms differ: free-tier content may be used to improve Google's products. The
site's privacy disclosure now names both supported providers.

To switch back, set `AI_PROVIDER=openai` and provide a valid `OPENAI_API_KEY` with
available API credits, then redeploy. The existing OpenAI model configuration
remains supported. Changing providers does not erase Supabase history or settings.

## Verification

Provider translation, credential isolation, incomplete/blocked responses, saved
chat history, provider-specific environment validation, and existing conversation
rules are covered by automated tests. A real Gemini key is still required to
verify live model access and the user's free-tier quota. No real Google credential
is bundled with the code.

References:
- https://aistudio.google.com/docs/openai
- https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite
- https://aistudio.google.com/docs/models/gemini-3.5-flash-lite
