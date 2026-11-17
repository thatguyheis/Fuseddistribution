# Instruction for ChatGPT: make Fused Distribution tech reels the same way as the Coins Since 1994 videos

Prepared 2026-11-15 for Nick.

Attach two files with this one:

1. `COINS-SINCE-1994-CHATGPT-HANDOFF.md` (the method). On Nick's Mac: `/Users/nick/projects/fuseddistribution/Coins since 1994/COINS-SINCE-1994-CHATGPT-HANDOFF.md`
2. This file (what changes for Fused tech reels).

## 1. Your job in one paragraph

Make short vertical tech education reels for Fused Distribution using the same method as the Coins Since 1994 auction lot videos: idea sheet first, Nick approves, then a segment script with a picture named for every line, charts and stat cards with sources, the same transitions and caption style, voiced and rendered one reel at a time, checked, and reported honestly. The handoff file is the method. This file tells you what to swap. Where the two disagree about a tech reel, this file wins. Nick has the final say.

## 2. What stays the same

Take these from the handoff without change:

- Stage order: idea sheet, Nick's approval, script, voice, render, check. Nothing is voiced or rendered before approval.
- Script shape: hook, one idea, closing. 145 to 170 spoken words, 9 to 11 segments, each under 240 characters, each naming its pictures.
- Chart kinds and data shapes (handoff section 8). At least 4 seconds per chart. Every value has a source.
- Motion: slow zoom on stills, push, flip, zoom through and wipe transitions, soft whoosh.
- Captions: capitals, two or three words at a time, spoken word highlighted, digits for numbers.
- File format: 720 x 1280, 30 fps, H.264, AAC, about minus 16 LUFS, under 25 MB.
- The `segments`, `enrich` and `say` format (handoff section 10).
- The checks (handoff section 12) and the honest per reel report.
- Hard limits: nothing posted, pushed, deleted or overwritten without Nick. New versions get `_v2`.
- One small revision round after Nick listens.

## 3. What changes

| Item | Coins Since 1994 | Fused tech reel |
| --- | --- | --- |
| Brand | Coins and Auctions Since 1994 | Fused Distribution, https://fuseddistribution.com |
| Unit | One auction lot | One tech lesson: one learner problem and one tool |
| Evidence pictures (`c1`, `c2`) | Lot photos | Real screenshots, screen clips or output files from the actual tool, with private details removed |
| Supporting pictures (`p123`) | Pexels photos | Pexels photos, or a clearly labeled teaching diagram |
| Story | History of the coin | How the tool or step works, shown on a real example |
| Top label | "LOT ###" plus coin name | Tool name plus lesson title, for example "BUFFER" over "Draft or scheduled?" |
| Colors | Gold accent | Fused colors: background `#041018`, accent `#58d6ff`, text white, muted `#afc6cf` |
| Opening | `boxintro.mp4`, 5 s, hook spoken over it | No intro clip. Frame zero is the approved hero image for the lesson, hook spoken over it from second zero |
| Ending | Auction closing line plus dated outro clip | One tie back line that answers the hook, then the call to action card. No outro clip unless Nick supplies one |
| Voice | C1994 reference, 0.4 / 0.5 / 0.6 | Nick's Fused voice: `video/voice-sample/voice-reference.wav`, settings from `video/tts-runtime.json` (0.75 / 0.3 / 0.8) |
| Buffer | C1994 account | Fused account, through the existing Fused publishing owner. Not your step. |
| Work folder | `Coins since 1994/` | A separate folder for tech reels (section 8) |

Never use the Coins Since 1994 voice, intro, outro, lot label or Buffer key for Fused work, and never the other way round.

## 4. Tech rules that have no coin equivalent

These come from `docs/TECH-EDUCATION-SOP.md` in the Fused repo.

**Evidence must match the demonstration**

- Every central claim needs two things: a current primary source (the tool's own documentation), and the real local artifact, screenshot or clip that shows it. Documentation proves what a tool can do. A Fused run record proves what we actually did. One does not stand in for the other.
- Record tool, version, mode and account plan before stating any feature, price or limit.
- Never invent a screenshot, API response, benchmark, customer result, time saving, view count or revenue figure.
- Diagrams and simulated failures are labeled as illustrations or simulations on screen.
- Use made up customer data in demos and say so. Remove keys, tokens, account names and private URLs from every picture.
- If you cannot get the real artifact, write `[NICK: need screenshot of X]` and plan the lesson as a labeled concept explanation, or hold it.
- Do not say captions were made by Whisper, or a voice by a given model, unless that run actually happened and you have the record.

**Hook**

- First sentence is a searchable question or a verified contradiction. Name the tool when useful.
- Swap test: if another tool's name fits the hook unchanged, the hook is too generic. Sharpen the problem.
- No greetings, no inflated promises, no claims about what the algorithm rewards.
- Example: "Your Buffer draft has a date. Will it actually publish?"

**Seven planning fields, saved for every lesson:** subject, hook, promise, explanation, visual support, payoff, variety.

**Variety**

- Rotate formats: explain a mechanism, show one task, correct a misconception, compare measured outcomes, unpack one documented incident.
- No two reels in a row on the same tool when another lesson is ready.
- Check the last 20 tech topics. Same question, same mechanism and same payoff means it is a repeat, even under a new tool name.

**Writing style (all Fused copy)**

- No em dashes. No hyphenated compound words in visible copy. Plain first person, one owner talking.
- Never use: leverage, seamless, streamline, synergy, innovative, cutting edge, optimize, holistic, empower, transformative, robust, scalable, ecosystem, game changing, disruptive, next generation, unlock, supercharge, delve.
- For the voice: write "percent", not "%". Add numbers and tool names to the `say` table when the voice may misread them.
- No legal, tax, financial or medical advice.

**Call to action**

- One per reel, spoken in the last 3 seconds and shown on screen: "Read the full breakdown at fuseddistribution.com." Use the follow line only if there is no matching blog post: "Follow for more on growing your business with AI."
- Put fuseddistribution.com in every caption.

## 5. Topics ready to use

These 23 seeds are already reviewed as directions, not as approved claims. Each still needs a current source check and a real matching demonstration. Full briefs with all seven fields: `content/tech-education/topic-expansion.json` in the Fused repo.

| Tool | Lesson | Hook |
| --- | --- | --- |
| Whisper | Whisper explained from speech to editable text | How does Whisper turn a voice recording into words? |
| Whisper | Whisper captions versus estimated subtitle timing | Why can correct captions appear at the wrong moment? |
| Whisper | Checking names and numbers in Whisper transcripts | Would you trust a transcript to spell your customer name? |
| Whisper | Local Whisper and hosted transcription differences | Does every transcription send your audio to the cloud? |
| Buffer | Buffer draft versus scheduled post explained | Your Buffer draft has a date. Will it actually publish? |
| Buffer | Verify a Buffer post after scheduling it | The upload succeeded. Did your post get scheduled? |
| Buffer | Buffer queue depth versus publishing cadence | Can a full Buffer queue still leave tomorrow empty? |
| Buffer | Buffer scheduled versus sent status explained | Scheduled is not sent. Where did the post stop? |
| Chatterbox | Narration and transcript tools explained | One tool speaks. Another listens. Why use both? |
| Chatterbox | Reuse unchanged narration safely | Why generate the same narration twice? |
| Remotion | Remotion explained as video built from components | How can the same video layout teach a different topic? |
| ffprobe | Check reel duration before uploading | Your filename says final. How long is the video really? |
| Buffer and local scripts | Automation retry without duplicate social posts | A request timed out. Should you press publish again? |
| Local workflow | Resume local automation after a computer is offline | Your computer was off. Which tasks really need replaying? |
| Chatterbox workflow | Stop repeated AI failures with a circuit breaker | Why does this automation stop instead of trying forever? |
| Local scripts and Gemma | When a local script is better than an AI agent | Do you need an AI model to count missing files? |
| Gemma | Test a small local language model on one real task | A smaller model is cheaper. Can it do this job correctly? |
| Local research workflow | Batch content preparation without repeating AI research | Why research the same source again for every post? |
| Website video embed | Why a hosted reel can be missing from a blog page | The video is online. Why is the player missing? |
| Cloudflare | Prove a website update is live after deployment | Deployment succeeded. Are visitors seeing the new page? |
| Meta Muse | Meta Muse for Facebook Page workflow planning | Can Muse help with your Facebook Page before anything is published? |
| Meta Muse | Meta Muse Instagram analytics and content decisions | Your Instagram views changed. What should Muse check first? |
| Meta Muse | Meta Muse and Buffer roles in a publishing workflow | If Muse helps plan the content, what still belongs in Buffer? |

Tech reels already published (do not repeat the same lesson): verify a Buffer post after scheduling it, using Remotion to make a business reel, using Chatterbox for business voiceovers, AI reels for beginners parts 1 and 2, the one number a small business should check weekly, calculate customer acquisition cost weekly.

## 6. Idea sheet template (Nick approves this before anything else)

One block per reel:

```
REEL T-##: <tool> | <lesson title>
Learner problem (one sentence):
Format: explain / one task / misconception / comparison / incident
Hook A:
Hook B:
Hook C:
Promise (what the viewer will know at the end):
Payoff line (answers the hook):
Evidence 1: <real screenshot or clip needed> | exists? yes / [NICK: ...]
Evidence 2:
Evidence 3:
Chart 1: <kind> | <title> | <values> | Source:
Chart 2:
Stock or diagram 1: Pexels <ID> | <photographer> | <URL>   or   DIAGRAM (labeled): <what it shows>
Primary sources: <name, date checked, URL>
Tool version, mode, plan:
Call to action: website / follow
Flags for Nick:
```

Nick answers in the same short form as the coin batches:

```
transitions: flip, push, zoom, wipe | sound: B
T-01: hook B, evidence keep 3/3, enrich keep 2/2, stock keep 1/1
END
```

## 7. Script format

Same as handoff section 10, with these changes: `lot` becomes `id` (for example `"T-01"`), `folder` is the reel's evidence folder, and the last two segments are the tie back line and the call to action. Example:

```json
{
  "id": "T-01",
  "slug": "buffer-draft-versus-scheduled",
  "title": "Draft or scheduled?",
  "tool": "BUFFER",
  "folder": "T-01 - Buffer draft versus scheduled",
  "music": "<a track from the approved cycle>",
  "enrich": {
    "post-states": { "kind": "timeline", "title": ["WHERE A POST CAN STOP"],
      "src": "Buffer developer guide, posts and scheduling, checked YYYY-MM-DD",
      "items": [["1", "Draft"], ["2", "Scheduled", 1], ["3", "Sent"]] }
  },
  "segments": [
    { "t": "Your Buffer draft has a date. Will it actually publish?", "img": [] },
    { "t": "<what the viewer sees in the real draft>", "img": ["c1"] },
    { "t": "<the mechanism, one idea>", "img": ["e:post-states"] },
    { "t": "<the check, shown on the real screen>", "img": ["c2", "c3"] },
    { "t": "<tie back line that answers the hook>", "img": ["c1"] },
    { "t": "Read the full breakdown at fuseddistribution.com.", "img": ["c3"] }
  ]
}
```

The values in angle brackets and the chart items above are placeholders to show the shape. Do not publish them. Fill them from the real source and the real screen.

Music: only tracks in `policy.trustedCycle` in `video/data/audio-rights.json`.

## 8. If you can run commands on Nick's Mac

- Before production, read `LOCAL-PRODUCTION-SOP.md` in this tech workspace. Follow its required caption clearing regression and multiple-frame export checks when using or adapting the installed renderer.
- Do **not** edit `Coins since 1994/tools/c1994_video_v2.py` or anything else in that folder. Make a copy named for tech reels and change the copy: intro removed in favor of the hero image at frame zero, outro removed, label text and colors from section 3, voice read from the Fused runtime file.
- Keep tech reel work in its own folder with the same layout as the coin project: `Raw/`, `Drafts/`, `Approved/`, `work/`, `Out/`. Suggested: `/Users/nick/Documents/ChatGPT/Fused Tech Reels/`, outside the Fused repo, so the repo's clean tree push gate is not affected. The copied tool finds the repo through a path setting, so point it at `/Users/nick/projects/fuseddistribution`.
- Do not touch the scheduled Fused pipeline, its queue, its LaunchAgents or `video/tts-runtime.json`. Read the voice settings, do not change them.
- One heavy job at a time, and never while a Fused render lock is active.
- No git push, no deploy, no Buffer post. Finished files go in `Out/` and Nick decides what happens next.
- Build one reel first and stop for Nick to watch it before making a batch.

If you cannot run commands: do sections 6 and 7 only, and hand back the idea sheet, research notes with links, and the script file.

## 9. Decisions for Nick

Defaults are filled in so work can start. Nick can change any of them.

| # | Decision | Default used |
| --- | --- | --- |
| 1 | Length | About 60 seconds, like the coin videos. The current tech SOP says 110 to 130 seconds for pipeline reels; these short reels are a separate format. |
| 2 | Scope | The Fused source of truth says scheduled content is coin history only. These tech reels are made by hand on Nick's request, outside the scheduled queue. |
| 3 | Intro and outro clips | None. Hero image opening and a call to action card. |
| 4 | Voice | Nick's Fused voice with the approved expressive settings. Make a one line sample first. |
| 5 | Blog pairing | Website call to action only when a matching blog post is live. |
| 6 | First batch | One reel, then 5 after Nick approves the look. |

## 10. Prompts to start with

1. "Read the handoff and the instruction file. Write the idea sheet for the first 5 tech reels in the section 6 template, each on a different tool. List every real screenshot you need from me."
2. "Here are my approvals: [paste the block]. Here are the screenshots: [attach]. Write the script file for T-01 in the section 7 format, with a source for every claim."
3. "Check this tech reel script against section 4 of the instruction and sections 7 and 14 of the handoff. List every rule it breaks, with the fix."
4. "Write the caption for T-01: two plain sentences, fuseddistribution.com, 3 to 5 hashtags."

## Sources

- `Coins since 1994/COINS-SINCE-1994-VIDEO-SOP.md` and `COINS-SINCE-1994-CHATGPT-HANDOFF.md` (method)
- `docs/TECH-EDUCATION-SOP.md` and `content/tech-education/README.md`, `topic-expansion.json` (tech rules and topics)
- `docs/reel_creation_handoff.md` (Fused colors, voice, music rules), `docs/REEL-OPENING-SOP.md` (hero image opening)
- `video/tts-runtime.json` (Fused voice settings), `public/blog/posts.json` (published tech posts)
- Research starting points: https://support.buffer.com/en-us/articles/saving-and-scheduling-draft-posts-CBLXg1yFXp , https://developers.buffer.com/guides/posts-and-scheduling.html , https://www.remotion.dev/docs/ , https://ffmpeg.org/ffprobe.html , https://ai.google.dev/gemma/docs , https://developers.cloudflare.com/workers/static-assets/ , https://developers.openai.com/api/docs/guides/speech-to-text , https://about.fb.com/news/2026/09/introducing-muse-small-business/
