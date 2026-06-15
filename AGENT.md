
# General behavior

* SPEC.md is the source of truth for plugin behavior. Read it at the start of every task — feature, bugfix, or anything else — and treat its requirements (especially the persistence-across-power-cycle requirement) as hard constraints. If a task seems to violate the spec, flag it before implementing. If the spec needs to change to accommodate a task, update SPEC.md as part of the work and call out the change explicitly.
* **Reading Reddit (e.g. r/Supernote_dev release notes / threads): always use the Composio Reddit connector, never WebFetch/WebSearch.** WebFetch is blocked on reddit.com and fails every time — don't waste a turn trying it. Load the Composio tools (ToolSearch for `COMPOSIO_SEARCH_TOOLS` / `COMPOSIO_MULTI_EXECUTE_TOOL`) and fetch via `REDDIT_RETRIEVE_POST_COMMENTS` (post body + comments; `article` = the base-36 post id from the URL, no `t3_` prefix) or `REDDIT_SEARCH_ACROSS_SUBREDDITS`. The reddit account is already connected.
* SDK_DOC.md is our **reference supplement to the official Supernote SDK docs** (https://docs.supernote.com/en), kept in the project root. The official docs are thin and frequently silent on the behaviour we depend on, so we document the gaps ourselves: what an API actually does, error codes it doesn't mention, lifecycle / cache behaviour, fields populated only under certain conditions, correct-usage patterns, things to avoid. **Write it as documentation for a plugin author using the API — like an SDK developer complementing the official docs — not as a lab notebook.** State each behaviour and how to use it as authoritative, concise fact. Do NOT include observation dates, trace/adb evidence, "we observed…" narrative, build IDs, or pointers into our own source files. Consult it before designing around any SDK API, and whenever diagnostic or feature work turns up a durable SDK fact, fold it in (in that style) as part of the wrap-up. SDK_DOC.md is for *what the SDK does*; FEEDBACK.md is for *what we want Ratta to change about it*.
* DECISIONS.md is our architectural decision log, kept in the project root. It records *why* non-obvious design choices were made and what alternatives were rejected — distinct from CHANGES.md (*what* changed) and SDK_DOC.md (*what the SDK does*). Consult it before reopening a settled design question, so we don't re-debate or accidentally undo a deliberate choice. The architect appends to it at the end of a workflow only when the decision was significant (see "Steps independent of workflow" step 4).
* For each new feature and for each step above, always come back to that file to make sure to remember the above.
* In case I forget a step and tell you to move on, remind me of it.
* If I pivot to a new topic while a workflow is still mid-flight (wrap-up steps unfinished: closing the backlog item, CHANGES.md, FEEDBACK.md, the commit, etc.), pause before engaging the new topic and remind me what's still open. Offer two options: (a) finish the open workflow first, or (b) explicitly park it by adding a line to `BACKLOG.md` describing exactly what's left to do, then move on to the new topic. Don't silently switch contexts — that's how steps get skipped and lost.
* At any time, in case you don't know for sure, rather admit it and come up with experiments (potentially including code instrumentation), rather than just guessing.
* Do all steps above separately so that you can always focus on one task and one task only.
* If, during a feature development, or after a fix attempt, it turns out the feature is not working as expected, switch automatically to the workflow for bugfixing. I tend to just move on and forget to do the basics.

# Backlog

The backlog lives in `BACKLOG.md` (project root). Read it when picking up
deferred work.

# Workflow for new features

For each feature request in `BACKLOG.md`, act as follows:
1. first act as an architect who challenges the Product Owner from a technical perspective (ex. if you think that the requested feature has some corner case that make it hard to implement so you'd request some simplification)
2. if there is no particularly issue and you think the feature is doable, move to the workflow for implementation below
3. Once I confirm the feature as implemented, remove it from `BACKLOG.md`

# Workflow for bug fixing

**Diagnostics first, fix second.** The Supernote SDK is in beta and the
online docs at https://docs.supernote.com/en are thin and frequently
silent on the behaviour we actually care about. That means you cannot
just pattern-match on an error message and jump to a fix — the wrong
mental model of the SDK will mislead you. Invest real effort in
diagnostics; that is what earns the right to propose a fix.

For every bug reported by the user, do the following:

1. **Quick guess.** Look at the code, try to form a hypothesis on the root
   cause. Keep it short — don't burn tokens on speculation. Very important:
   if you have no clue though say it, do not speculate. I'd rather we take
   the time to diagnose (next step) rather than guess wrong.
2. **Report the result and ask for the next step: follow the guess or 
  diagnose deeper.** Do not start implementing. If the guess is wrong or
  the user wants more depth, move to step 3.
3. **Triage with instrumentation.** Act as a triage engineer: add
   focused logs / dumps in the code paths involved, build, and ask the
   user to copy-paste the trace. Make logs informative (include element
   ids, paths, sizes, whatever lets you root-cause from a single trace).
   **Prefer time-series instrumentation: when a value is suspect, log it
   at successive labelled checkpoints (A/B/C…) along the code path so the
   trace shows exactly *where* it changes.** Watching one value evolve
   step by step has repeatedly pinpointed the precise call that breaks it
   (e.g. which API shrank a picture, which read returned a stale rect) far
   faster than reasoning about a single end-state dump.
4. **Validate against the device, not the docs.** When the SDK is
   involved, treat the official docs as a starting point only. Use adb
   to inspect on-device state (filesystem, logs, paths returned by the
   SDK) and confirm what is actually happening, not what the docs
   suggest should happen.
5. **Iterate** between hypothesis → instrument → observe → refine,
   until you have *relative certainty* on the root cause.
6. **For non-trivial investigations, write DIAGNOSTIC.md.** If the
   triage takes more than one or two rounds of instrumentation, capture
   the findings in a file `DIAGNOSTIC.md` at the project root: the
   symptom, the trace evidence, the hypothesis you ruled out, the final
   root cause, and the implications for any fix. This keeps the
   conversation context lean and gives the user something to review.
7. **Report a solid, well-argued diagnostic and ask for confirmation
   that you've root-caused it.** A diagnostic is "solid" when it
   identifies the exact mechanism (not just "probably the SDK"), is
   backed by observed traces, and predicts the fix.
8. **Plan the fix.** Two options depending on diagnostic strength:
   - If the diagnostic is solid and the fix is small and localised
     (single helper, single call site), you may skip PLAN.md and
     propose the fix inline. A trustworthy diagnostic earns this.
   - Otherwise, act as an architect and write PLAN.md (file-per-file
     scope, small steps), and follow the implementation workflow below.
9. **Implement** (per the implementation workflow if PLAN.md exists, or
   directly if it doesn't).
10. **On confirmation from the user, clean up.** Remove every
    diagnostic log, scratch file, or experimental code change you added
    during triage. Delete DIAGNOSTIC.md once the bug is closed.
    Promote any durable SDK insight to `SDK_DOC.md` (see General
    behavior) and any actionable feedback for Ratta to `FEEDBACK.md`
    before deleting DIAGNOSTIC.md, so the lessons survive.
11. **Suggest a git commit.** See "Steps independent of workflow"
    below — propose the commit(s), don't just leave the working tree
    dirty.

# Workflow for implementation

1. if there is no particularly issue and you think the feature is doable, create a plan of the implementation and store it in a file PLAN.md.
2. Make sure the plan is splitted in file-per-file changes, with a clear, small scope (ideally file-level, as little multi-file changes as possible)
3. Request a review of the plan.
4. Check that the plan is not recreating unnecessary logic or redundant steps with respect to the existing codebase.
5. If this changed the plan, ask for a review again.
6. Once approved, start with implementation, one step after the other. Ask for a review after each step.
7. Once a step is done, amend PLAN.md to mark the corresponding step as done - then re-read the plan and the next step before moving on. I want you to always get back to the plan as an "anchor" to avoid that you deviate.
8. After each step that stands on its own (compiles, doesn't break the build), suggest a git commit for that step before moving to the next one. I tend to forget to commit, so be proactive about offering it.

# Steps independent of workflow

Once I confirm that a feature or bugfix is done:
1. remove the PLAN.md file
2. add a short summary of the change to CHANGES.md (I will use this for release notes)
3. if something on the way was discovered that needs to be a feedback to the Supernote developers (either bug fix or developper doc improvement), collect it in FEEDBACK.md. **Keep each entry terse and ready to paste** as a Reddit comment on the r/Supernote_dev plugin-preview thread (plain prose, no heavy markdown — Reddit mangles it; that's how I deliver feedback). Two formats only:
   - **Doc request**: one line — `doc of <xyz> is unclear, here is a proposal: ...`. That's it.
   - **Bug**: numbered repro steps (`1.`, `2.`, `3.`, …), then `expected: ...` and `observed: ...`.
   Don't pad with extra prose. Use the Composio Reddit connector if you need the thread for context.
4. **If the work involved a significant architectural decision, record it in DECISIONS.md.** Only when it actually matters — the test is "would a future agent (or I, months from now) be tempted to re-debate or undo this?". Concretely, add an entry when the architect phase considered and rejected at least one alternative approach, or when a diagnostic uncovered a fundamental SDK constraint that shaped the design. Routine fixes don't need an entry — CHANGES.md already records *what* changed; DECISIONS.md records *why* a non-obvious path was chosen and what was rejected. Each entry: date, the decision, the alternatives considered and why they lost, and any constraint that forced it. This is the architect's responsibility at the end of a feature or bugfix workflow.
5. **Suggest a git commit (or multiple commits) of the resulting changes.** I tend to forget to commit, so always end a workflow by proposing the commits. Split into separate commits per concern — for example, the bug fix + its CHANGES.md / FEEDBACK.md entries in one commit, and any workflow / SDK_DOC.md / DECISIONS.md / AGENT.md updates in a separate commit. Wait for my go-ahead before running `git commit`.