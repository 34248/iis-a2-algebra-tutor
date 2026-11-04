# Controlled algebra practice

README prose word count: 723. Code and setup commands excluded.

An IIS A2 learning workspace for the A1 question about attempt-first gradual help versus an immediate worked solution. Both modes reveal identical authored steps. Python 3.12 or later; the app uses the standard library only.

## Run
```text
python app.py --port 8764 --open
```
On this Windows computer, run.cmd selects the prepared Python runtime and opens the browser. Otherwise supply Python 3.12 or later. If the requested port is occupied the app selects a free local port; follow the printed URL. Stop the server with Ctrl+C. It binds only to 127.0.0.1 and needs no API key.

## Use the workspace
Choose an item and help format, then start. Record an explanation or check a complete equation. A recorded nonempty attempt unlocks the first requested hint in gradual mode. The equation checker releases no worked step. Immediate mode shows all the same steps together. Enter a final answer; successful completion offers the paired new question without hints. You may retry that question. Download the session CSV before starting again.

Nine practice items and nine paired new items cover whole numbers, negative values, fractions, brackets and variables on both sides. Demo controls are folded away: inspect incomplete input, the intentionally defective baseline or an unavailable response there. Equation feedback can be disabled in both conditions, including through the backend; the trace records this setting. The interface does not automatically assign conditions or lock a research task sequence.

## Implemented and simulated work
Implemented: browser workspace, session controller, exact numeric checks, symbolic linear-equation equivalence checks, startup verification of authored answers and substitution checks, completion feedback, paired-item handoff and CSV export. algebra.py reduces a restricted expression grammar to linear forms using Fraction. Submitted expressions are not executed. An equivalent line is not evidence that the learner understands its justification.

Simulated: the language-model response boundary in model.py returns prefixes of checked content. No live language model is connected. The controller validates status and steps and displays its own acknowledgement. The equation checker is real rule-based computation, separate from that simulated component. Participant recruitment, prior-knowledge testing, assigned conditions, controlled post-testing and conceptual scoring remain planned. See docs/RESEARCH_PROTOCOL.md for what would be needed to test A1's research question.

## Records
telemetry.py persists event metadata under data/ and exports the active session. Free-text working and session access tokens are excluded. A trace ID identifies a session, not a participant. Restarting the server removes in-memory practice state; saved files remain until deleted. data/ is excluded from Git and the review ZIP. A server-file failure is disclosed while an in-memory CSV remains downloadable.

Invalid unaided input has its own event and blank correctness. Valid numeric submissions can be correct or incorrect. Equation equivalence, valid-answer counts and the feedback setting are additional fields. See docs/TRACE_FORMAT.md. Default terminal diagnostics omit free text. Files labelled developer_demo or developer_check were produced by assistant-run software checks, not research participants.

## Development and checks
The project adapts the algebra path of the earlier assisted Lab4, baseline commit 65fd133. Source fingerprints and exclusions are in docs/PROVENANCE.md. The original lab remains separate. docs/DEVELOPMENT.md records trace export, response-contract fixes, pending-request controls and the later learning-workspace development.

The current release passes 40 code tests and 32 browser checks. Checks cover all authored items, equation syntax and equivalence, identical help text, wrong/invalid answers, response failure, overlapping requests, exports, mobile/dark layout, completion and the comparison setting. These establish software behaviour, not a learning improvement.

```text
python -m unittest discover -v
```

Optional browser tooling uses Node.js and Playwright separately from the app. Set PYTHON_EXECUTABLE and, if using an existing Chromium-family browser, BROWSER_EXECUTABLE. Inspection uses temporary trace directories and writes labelled evidence.

```text
npm install --no-save playwright
npx playwright install chromium
node tools/browser_checks.cjs
node tools/browser_regressions.cjs
node tools/browser_quality.cjs
node tools/browser_learning.cjs
```

## Assistance and review version
OpenAI Codex adapted the earlier Lab4, implemented this extension, ran checks, captured evidence and helped draft the report and reading guides. The humanizer skill assisted prose review. Corrections include an answer leaking through format feedback, malformed input being scored as wrong, unconstrained response prose and inconsistent trace counts. The student still needs to inspect the choices and explain them. No unaided authorship or participant activity is claimed.

Local review release: a2-review-v4. GitHub is connected; repository creation, publication and actual public links are pending. No Canvas submission has been made. docs/ contains report copies, editable figures, development records and Chinese reading companions. The review ZIP also includes evidence/development.bundle to restore the actual local history; the bundle itself is omitted from Git. Saved research papers are outside the public project package.

```text
git clone evidence/development.bundle iis-a2
```
