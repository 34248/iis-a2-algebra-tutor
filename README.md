# Controlled algebra practice

README prose word count: 667. Code and setup commands excluded.

An IIS A2 prototype for the A1 question about attempt-first gradual help versus immediate worked solutions. Nine authored practice items and nine paired new items cover signs, fractions, brackets and multi-step equations. Both help formats use identical checked steps.

## Status and review version

Local review release: a2-review-v5. The application behaviour is unchanged from a2-review-v4; this revision strengthens the report, inspection instructions and evidence mapping. Public repository and README links are still outstanding. No Canvas submission has been made.

Implemented: browser interaction, exact linear-equation checks, gradual/immediate help, answer checking, paired unaided practice and local trace export. Simulated: model.py returns checked steps through an offline response interface; no live language model is connected. Planned: recruitment, prior-knowledge measurement, condition assignment, controlled post-testing and conceptual scoring. [Research boundaries](docs/RESEARCH_PROTOCOL.md) explain these gaps.

## Run or inspect

```text
python app.py --port 8764 --open
```

Use Python 3.12 or later. The application has no third-party dependencies or API keys. run.cmd uses the prepared Windows runtime where available, otherwise Python on PATH. Follow the printed URL if the requested port is occupied. The server binds to 127.0.0.1; stop it with Ctrl+C.

Start with the [inspection walkthrough](docs/INSPECTION.md). It gives inputs, expected responses, current screenshots and the source files responsible. The [report](docs/IIS_A2_Project_Report.pdf) contains the rationale, architecture and three illustrated interactions. Editable figures are in [docs/figures](docs/figures).

Record an explanation or check an equation before requesting gradual help. Immediate mode shows all the same steps together. A correct final answer offers the paired new question. New questions allow retries and immediate feedback, so they are practice rather than a controlled post-test. Export CSV before restarting. Demo controls contain the intentionally defective baseline, unavailable-response simulation and the option to disable equation feedback in either condition.

## Technology and boundaries

| Component | Role |
| --- | --- |
| HTML, CSS and client.js | Browser controls, persistent steps and feedback |
| Python standard library and app.py | Local HTTP service and session controller |
| algebra.py and Fraction | Restricted linear expressions and exact solution equivalence |
| problems.json and transfer.json | Checked, authored tasks and solutions |
| model.py | Simulated response boundary with validated step prefixes |
| telemetry.py | Metadata-only JSONL and active-session CSV |

The checker does not execute submitted expressions or grade explanations. Fixed content keeps the help comparison inspectable; it cannot offer open-ended dialogue. Optional equation feedback is enforced by the server and recorded in the trace.

## Development and assistance

The [development record](docs/DEVELOPMENT.md) explains changes, their reasons and checks. [Provenance](docs/PROVENANCE.md) identifies the reused Lab4 baseline and source fingerprints. The original lab remains separate. The [decision record](docs/DECISIONS.md) distinguishes the student's stated requests from assistant implementation and review still to be done.

OpenAI Codex adapted the lab, implemented features, ran checks, captured evidence and assisted drafting. Earlier prose review used the humanizer skill. Corrections included an answer leaking through placeholder feedback, invalid input being scored as wrong, declined responses releasing steps and stale results after input changes. These assistant-run checks do not establish the student's independent authorship or participant learning. The student must inspect the result and be able to explain the choices.

## Checks and records

The unchanged application has evidence for 40 code tests and 32 browser checks. [The evidence index](docs/INSPECTION.md#verification-evidence) links their results and distinguishes historical failures. These are software checks, not learning outcomes.

```text
python -m unittest discover -v
```

Browser checks additionally require Node.js and Playwright. Set PYTHON_EXECUTABLE and optionally BROWSER_EXECUTABLE for an installed Chromium-family browser.

```text
npm install --no-save playwright
npx playwright install chromium
node tools/browser_checks.cjs
node tools/browser_regressions.cjs
node tools/browser_quality.cjs
node tools/browser_learning.cjs
```

Saved traces under data/ are excluded from Git and the review ZIP. They contain event metadata, not names, free-text working or access tokens. A trace identifier denotes a session, not a participant. Restart resets in-memory practice state; saved files remain until deleted. A file-write failure is disclosed while in-memory CSV remains downloadable. [Trace fields](docs/TRACE_FORMAT.md) explain invalid inputs and timing limits. developer_demo and developer_check records are automated examples.

## Additional material

The local review ZIP is a convenience copy, not an extra Canvas requirement. It includes evidence/development.bundle to restore the actual local Git history; the ignored bundle is not published in Git. Research-paper reading copies remain outside the repository and ZIP. The intended Canvas deliverable is one report linking the public repository, README and submitted commit or release. No video is required for A2.

```text
git clone evidence/development.bundle iis-a2
```
