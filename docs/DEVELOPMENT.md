# Development record

## Imported tutor
Retained the two checked items, attempt-first release, immediate comparison, input validation and separate unaided route from Lab4. Removed the unrelated course/vision/tool exercises from the A2 interface so the implementation matches the A1 research question. Their original lab files remain separate.

## A2 trace extension
Added telemetry.py and an export endpoint. Traces store counts, timestamps, presentation condition and unaided correctness; they exclude names, free-text attempts and session access tokens. Added five focused tests covering export contents, session isolation, unknown exports, disk-write failure and a refused hint releasing zero steps. The 13 inherited tutor tests remain.

## Corrections found during verification
The independent Python runtime did not discover telemetry.py when it was imported before the app's explicit module-directory insertion. Moving the import below that insertion made direct startup work. Browser inspection also exposed input clearing after an asynchronous start request; clearing before the request preserves work typed while it is pending. Screenshot review also exposed inherited placeholders that supplied the first algebra step and numeric answer. They now ask for an original attempt and a number or fraction. Restart or setup changes clear old export messages, progress and unaided answers so the next session is not shown with stale state. Browser tests explicitly wait for completed responses before inspecting the UI.

## Verification
18 automated code tests and 16 browser checks pass. Six screenshots and two downloadable CSV examples were produced by Codex. Mobile layout was checked at 390 pixels. Unknown export and cross-origin requests are refused. Browser checks preserve mode-content equality, correction/restart and unavailable-response behaviour. These are software checks, not participant research.

## Limits and next work
Attempts are checked for nonempty text, not mathematical reasoning. The baseline deliberately reveals a selected solution when input is mismatched and is clearly labelled as a defect demonstration. Unaided practice allows retries and is not a secure post-test. A future participant study requires suitable review and its own recruitment, assignment and analysis plan. No study outcome is fabricated.

## Review update on 3 November 2026
Two additional browser checks were first run on release a2-review-v1. During a delayed hint response, restart, mode selection and other actions remained available. This permitted conflicting requests or a changed setup while an older response was still pending. The unassisted selector also kept the preceding item's answer and Correct message. The observed pre-fix failures are labelled in evidence/regression_before_v2.json.

The interface now disables conflicting setup and action controls while a request is pending, then restores controls from the actual session state. The attempt input remains editable while practice starts. Changing an unassisted item clears its old answer and feedback. The additional checks hold a real local response before it reaches the browser, inspect the disabled controls, then release it; they also check feedback after changing the unassisted item. They are meaningful regressions for displayed session state, not participant observations.

The report names the local review release a2-review-v2. Its Chinese reading companion explains the problem, paragraph purposes, source uses and practical inspection steps. Public repository links and the student's own review are still outstanding. No public upload or Canvas submission occurred during this local update.
