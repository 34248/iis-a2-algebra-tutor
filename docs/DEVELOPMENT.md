# Development record

## Imported tutor
Retained the two checked items, attempt-first release, immediate comparison, input validation and separate unaided route from Lab4. Removed the unrelated course/vision/tool exercises from the A2 interface so the implementation matches the A1 research question. Their original lab files remain separate.

## A2 trace extension
Added telemetry.py and an export endpoint. Traces store counts, timestamps, presentation condition and unaided correctness; they exclude names, free-text attempts and session access tokens. Added five focused tests covering export contents, session isolation, unknown exports, disk-write failure and a refused hint releasing zero steps. The 13 inherited tutor tests remain.

## Corrections found during verification
The independent Python runtime did not discover telemetry.py when it was imported before the app's explicit module-directory insertion. Moving the import below that insertion made direct startup work. Browser inspection also exposed input clearing after an asynchronous start request; clearing before the request preserves work typed while it is pending. Screenshot review also exposed inherited placeholders that supplied the first algebra step and numeric answer. They now ask for an original attempt and a number or fraction. Restart or setup changes clear old export messages, progress and unaided answers so the next session is not shown with stale state. Browser tests explicitly wait for completed responses before inspecting the UI.

## Initial verification before later revisions
18 automated code tests and 16 browser checks pass. Six screenshots and two downloadable CSV examples were produced by Codex. Mobile layout was checked at 390 pixels. Unknown export and cross-origin requests are refused. Browser checks preserve mode-content equality, correction/restart and unavailable-response behaviour. These are software checks, not participant research.

## Initial limits before the equation checker was added
Attempts are checked for nonempty text, not mathematical reasoning. The baseline deliberately reveals a selected solution when input is mismatched and is clearly labelled as a defect demonstration. Unaided practice allows retries and is not a secure post-test. A future participant study requires suitable review and its own recruitment, assignment and analysis plan. No study outcome is fabricated.

## Review update on 3 November 2026
Two additional browser checks were first run on release a2-review-v1. During a delayed hint response, restart, mode selection and other actions remained available. This permitted conflicting requests or a changed setup while an older response was still pending. The unassisted selector also kept the preceding item's answer and Correct message. The observed pre-fix failures are labelled in evidence/regression_before_v2.json.

The interface now disables conflicting setup and action controls while a request is pending, then restores controls from the actual session state. The attempt input remains editable while practice starts. Changing an unassisted item clears its old answer and feedback. The additional checks hold a real local response before it reaches the browser, inspect the disabled controls, then release it; they also check feedback after changing the unassisted item. They are meaningful regressions for displayed session state, not participant observations.

The report names the local review release a2-review-v2. Its Chinese reading companion explains the problem, paragraph purposes, source uses and practical inspection steps. Public repository links and the student's own review are still outstanding. No public upload or Canvas submission occurred during this local update.


## Optimisation before submission
Nine further code checks target response validation and truthful records. Eight of those methods were first run against v2 and exposed failures or errors, including recording malformed answers as incorrect, releasing a declined response, printing free-text context and updating state before its trace had been recorded. The original local pre-fix output is retained outside the publishable project; evidence/quality_before_v3.json summarises its role. An additional check guards against leaking unreleased answers through a free-text response.

Response validation now checks accepted/simulated flags, reply type and checked steps. The interface displays the controller's acknowledgement rather than arbitrary response prose. An injected exception preserves earlier steps and allows retry. Numeric parsing is shared by practice and unaided items, uses Fraction without expression evaluation and accepts signed decimals and spaced fractions. Invalid unaided input has correct=null and its own event; CSV correctness is empty, so it is not misclassified as wrong.

Public start/action/transfer/export calls share a reentrant lock around both state access and trace recording. This keeps event counts consistent when requests overlap. The default context logger omits free text. Browser logic is separated into client.js, and a delayed check cannot attach a Correct message to an answer edited while waiting. The export message distinguishes a browser download from the server copy, including actual disk-write failure.

Validation: 27 code tests and 22 browser checks pass. The extra browser_quality.cjs script starts the real server with a deliberately unusable trace directory, downloads CSV and checks feedback during delayed local responses. These are developer checks, not participant data or a speed benchmark. Source Lab4 files remain unchanged. The local review version is a2-review-v3; no Canvas submission has been made.


## Learning workflow and research scope on 4 November 2026
User review identified that the earlier two-item demonstration was too thin. Added algebra.py, a restricted AST-based linear-expression reducer using exact rational arithmetic. It checks equation equivalence without evaluating submitted code, reveals no worked step on its own and does not grade written explanations. Catalog answers, intermediate equations and substitution checks are validated at startup.

Expanded to nine practice/new-item pairs, including variables on both sides, brackets and fractional coefficients. Replaced the inspection-led page with a learner workspace, persistent working/hints, completion feedback and a paired-item handoff. Demo controls are collapsed; mobile practice moves to the working area after start. Browser feedback still rejects results for an answer edited while checking.

Research review also identified that extra equation feedback could change the A1 comparison. Added a server-enforced session setting that disables it in either mode and records that choice. This supports controlling feedback; it does not implement assignment or a locked research sequence. RESEARCH_PROTOCOL.md distinguishes the implemented mechanism from the pre-test, controlled post-test, conceptual scoring and participant study still needed.

40 code tests and 32 browser checks pass. The new tests verify all eighteen authored questions, exact equation forms, wrong steps, rejected syntax, catalog corruption, completion, fractional/multi-step items, privacy of exported working and comparison controls. Four current workspace screenshots and a labelled learning-demo export accompany the prior evidence. These remain software checks without participant learning outcomes.


## Requirements review on 12 November 2026

Rechecked the full Canvas A2 page and rubric. The report now explains the fixed-content trade-off, the cost of learner-controlled hints and the student's documented requests that shaped scope. The README links a three-interaction walkthrough, current evidence, provenance and a separate attribution record. Earlier verification and limits sections above are labelled as historical stages to avoid mistaking the initial nonempty-attempt check for the later equation checker.

The application code and original software evidence are unchanged. This revision checks documentation links, report length and rendered pages, and packages the current source. No new participant data, live model, public upload or Canvas submission is claimed. Local release: a2-review-v5.
