# Controlled help in algebra practice

README prose word count: 548 (excluding headings and commands).

## Run the tutor

Open run.cmd on Windows, or run the following from this directory with Python 3.12. Open the address printed by the server. No external services or Python packages are needed for practice.

```text
python app.py --port 8769 --open
```

Choose a problem and a help mode, then start. A10 through A13 combine denominators, nested brackets, decimal coefficients and variables on both sides. Submit a line such as “Multiply both sides by 12: 3(3x - 2) - 2(x + 1) = 4(x - 1)” on A10. Use a space or a line break between complete equations and press Check my steps. Each step is compared with the original equation. On desktop, hints appear to the right. The paired independent exercise opens after the final answer is correct. Written explanations can also be recorded without a score. The language button switches between English and bilingual English–Chinese labels.

To add a pair, choose Basic, Multi-step or Challenge and select Generate a new question. The tutor samples coefficients locally, verifies each step and both answers, and saves the pair under data/generated. Switch help mode to inspect the same problem again. The menus list only the built-in questions. Each newly generated pair opens for the current practice.

For extra practice, select Two-variable challenge from Choose a problem. Try elimination or substitution and check the two coordinates against both equations. This exercise sits outside the recorded comparison.

## Try the comparison

In gradual mode, record an attempt and request one step. Switch to the full worked example and start again to see the same sequence together. After solving each practice item, try its paired exercise independently. Each mode can be run with the extra equation checker disabled. To compare testers on this computer, enter P01 before starting the first session and P02 for the second tester. Open Live results in a separate tab. It refreshes every two seconds and shows one row per labelled session. The first and latest independent results refer to the assigned paired item. Leave the code blank for practice outside the dashboard. The [walkthrough](docs/INSPECTION.md) describes the controls.

## Implementation and evidence

The Python server checks supported linear equations and numeric answers using fractions. The response module simulates delivery of authored steps. The browser requests a step, and the controller validates how much to release. No API key is required. Practice events can be stored locally. [Trace fields](docs/TRACE_FORMAT.md) describe which events are saved. The examples in evidence are developer demonstrations. There has been no participant trial.

The project extends the Lab4 tutor in the [provenance record](docs/PROVENANCE.md). Earlier revisions added trace export, input checking and the paired independent exercises. The algebra-only branch starts from the version before image import. The four new pairs keep the two help modes comparable while giving more experienced learners longer problems. An input fix lets students submit a description followed by a colon and an equation. Codex helped implement these changes, draft and edit the report and test the result. New items were checked against their worked lines and substitutions. The [development record](docs/DEVELOPMENT.md) gives the sequence of changes.

## Verify

```text
python -m unittest discover -v
```

With the local app running on port 8769, run the challenge walkthrough with Node and Playwright. Set BROWSER_EXECUTABLE if using an installed Chromium browser. TUTOR_URL can point to a different local port.

```text
node tools/browser_challenge.cjs
node tools/browser_live_results.cjs
```

The [report](docs/IIS_A2_Project_Report.pdf) includes the architecture and three illustrated interactions. This copy is for local review. Public GitHub links are still required for submission.
