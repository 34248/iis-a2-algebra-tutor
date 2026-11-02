# Controlled algebra tutoring

README prose word count: 655. Code and setup commands excluded.

An IIS A2 prototype comparing attempt-first gradual help with an immediate worked solution. Both modes use identical checked content. Python 3.12 or later, standard library only.

## Run and inspect
```text
python app.py --port 8764
```
Open http://127.0.0.1:8764 . The server stays bound to this computer. Stop with Ctrl+C. On Windows, run.cmd uses the prepared local Python 3.12 runtime if available, otherwise Python on PATH. Use a Python 3.12 or later interpreter.

Choose A01, revised gradual mode. Start, enter an attempt and request one hint. Compare immediate mode. Enter `2x + = 11` in revised mode, correct it and restart. Try T01 without help, then export the current session. The labelled baseline intentionally demonstrates missing-input guessing; use revised mode for ordinary inspection.

## Status and technology
Implemented: HTML/JavaScript interface, Python HTTP controller, input validation, independent session state, attempt gate, identical step content, rational numeric checks, local traces and CSV export. Simulated: tutor response synthesis in model.py. Planned: live-model integration if justified, participant comparison, prior-knowledge assessment, random assignment, conceptual scoring and retention measurement. There are two checked practice items and two unaided items; this is not a general equation solver.

The A2 version imports the algebra path from the A1-aligned Lab4. Unrelated teaching-corpus, recorded-vision and scheduling exercises stay in the original lab. See docs/PROVENANCE.md and docs/DEVELOPMENT.md for the source snapshot, changes and checks.

## Data
Session state and free-text attempts are held in memory. telemetry.py saves event metadata under data/; attempts and session access tokens are not written into the trace. CSV export contains only the selected session. data/ is excluded from Git. Delete that local directory when its inspection traces are no longer needed. A restart resets practice state and makes old sessions unavailable to the UI; existing JSONL files remain on disk. File-write failure does not block practice, and the export response reports whether the local file was saved.

evidence/developer-demo*.csv are assistant-run demonstrations, labelled developer_demo. They are neither participant observations nor learning-effect results. No participant study has been conducted.

## Checks
```text
python -m unittest discover -v
```
The checked A2 version has 18 passing code tests and 16 browser checks. Evidence records, screenshots and demonstration exports are in evidence/. Test sessions use isolated temporary trace directories. The browser automation checks real local HTTP requests and actual downloads. No performance or learning benefit is inferred from passing tests.

## AI assistance and authorship
OpenAI Codex prepared the earlier Lab4 code and this A2 extension, wrote and ran checks, captured evidence and helped draft the report. The humanizer skill was used for prose review without changing the technical claims. Examples of corrections include the runtime import order, restart/input timing and keeping free-text attempts out of persisted traces. The student needs to inspect the system and take responsibility for the submitted choices. No unaided authorship or participant activity is claimed. Local commits describe assisted development.

## Report and version
The report, architecture and interaction figures are in docs/. Local review release: a2-review-v1. The submitted commit and public repository URL must be recorded when published. Repository publication is pending; no working public URL is claimed. Additional local packaging and a Chinese reading guide accompany the report.

## Reproducing browser inspection
The optional script tools/browser_checks.cjs uses Node.js and Playwright, independently of the standard-library app. Install Playwright and its Chromium browser in a separate tooling environment, then run the script from this directory. Set PYTHON_EXECUTABLE to a Python 3.12 interpreter. BROWSER_EXECUTABLE may select an existing Chromium-family browser. Inspection creates fresh labelled demonstration evidence and uses a temporary trace directory. It does not recruit participants.

```text
npm install --no-save playwright
npx playwright install chromium
node tools/browser_checks.cjs
```

## Local review archive
The accompanying ZIP contains this project, report copies, demonstration evidence and evidence/development.bundle. The bundle preserves the actual local Git history and is omitted from the repository itself. To restore that history from an extracted ZIP:

```text
git clone evidence/development.bundle iis-a2
```

The Chinese guide and docs/A2_REQUIREMENTS_CHECK.md explain review steps and the outstanding public links. The report is a review draft until those links and its submitted version are filled in. No Canvas upload has been made.
