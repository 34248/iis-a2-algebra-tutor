# Inspection walkthrough

For the current release select A10, enter the first worked line shown in the README, request a hint, and compare it with the complete solution in immediate mode. Run tools/browser_challenge.cjs to check all four new pairs. Earlier walkthroughs and screenshots below relate to the base release.

## Follow three interactions

| Interaction | Actions | Expected response | Evidence and implementation |
| --- | --- | --- | --- |
| Attempt and request help | Choose A01 and Try first; start. Before recording work, inspect the unavailable hint. Enter 2x = 8, check the equation, then request one hint. Restart A01 in immediate mode. | The check accepts an equivalent equation without releasing steps. One requested hint releases one step. Immediate mode displays all the same checked content. | [Current workspace](../evidence/07-learning-workspace.png); [story 1](figures/story-1.png); app.py and model.py |
| Correct a mistaken step | In A01, check 2x = 14, then check 2x = 8. | The first changes the solution; the second is equivalent. Neither operation releases another hint or grades the explanation. | [Story 2](figures/story-2.png); algebra.py; test_learning.py |
| Complete and practise independently | Enter tester code P01, choose A09, start, check 2(x-1) + 3x = 24, and enter final answer 26/5. Open its paired new question T09 and answer 6. Open Live results. | Equivalent line; practice completion; paired item without worked hints; a P01 row with the first and latest paired outcome. Retries remain available, so this is not a controlled post-test. | [Multi-step workspace](../evidence/10-multi-step-workspace.png); [completion example on A05](../evidence/08-completed-and-independent.png); [story 3](figures/story-3.png); app.py and telemetry.py |

The completion screenshot shows the separately tested fraction pair A05/T05, not the A09 input in this walkthrough. Figures are illustrative storyboards; screenshots are captured software runs.

## Check boundaries

Disable Allow equation feedback under Demo controls and start a new session. Equation checks must be unavailable in both help modes; equation_feedback in the local event record records the setting. This controls one source of additional feedback but does not assign research conditions.

Use the unavailable-response option and request help after recording an attempt. Existing steps should remain and no additional step should appear. Restore availability and retry. The baseline option deliberately skips the input check; use it only to inspect the retained defect, not as a study treatment.

## Verification evidence

| Evidence | Interpretation |
| --- | --- |
| [unit-tests.txt](../evidence/unit-tests.txt) | 40 code tests for the current application |
| [browser_checks.json](../evidence/browser_checks.json) | 16 initial browser checks |
| [browser_regressions.json](../evidence/browser_regressions.json) | 2 pending-request and stale-feedback regressions |
| [browser_quality.json](../evidence/browser_quality.json) | 4 response/export/feedback checks |
| [browser_learning.json](../evidence/browser_learning.json) | 10 learning-workspace checks |
| [learning-demo-trace.csv](../evidence/learning-demo-trace.csv) | Automated demonstration, not participant data |
| [regression_before_v2.json](../evidence/regression_before_v2.json) and [quality_before_v3.json](../evidence/quality_before_v3.json) | Historical pre-fix failures; not the current result |

Evidence timestamps identify the original runs. This documentation revision does not relabel old runs as new experiments. The bundle in the local review ZIP preserves the real development commits.
