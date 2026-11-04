# Controlled Help in an Algebra Tutoring Prototype

Formatted Word/PDF count: 1140 total; abstract 134; main 1006 including headings, AI acknowledgement and repository status. Short figure labels/captions and references excluded.

## Abstract

This project explores how an introductory algebra tutor can offer help while leaving students an opportunity to attempt a problem. It develops A1 into a local browser prototype with attempt-first gradual help and an immediate worked solution, using identical checked content. Nine practice equations and nine paired unaided items cover integers, signs, fractions and multi-step working. An implemented rule-based checker tests whether a proposed linear equation preserves the original solution. It does not grade written reasoning. The interface supports correction, persistent steps, completion feedback and local CSV export without saving free-text working. Equation feedback can be disabled in both conditions for a presentation-only comparison. The language-model response boundary remains simulated; no live model is connected. Software checks demonstrate behaviour, not learning effectiveness. Prior-knowledge measurement, assigned conditions and a controlled participant comparison remain future work.

## Problem and scope

Completing an equation with assistance does not establish independent problem solving. A1 proposed comparing help presentation while holding solution content fixed. Koedinger and Aleven’s (2007) assistance dilemma motivates preserving thinking opportunities alongside guidance. Intended users are university students revising introductory algebra. The authored set now has nine practice equations and nine paired unaided items, including brackets, fractions and variables on both sides. This extends an overly small two-item demonstration. Learners already proficient in these skills may score near the ceiling; a future study must assess prior knowledge rather than assume these tasks are challenging.

The starting point was the A1-aligned Lab4 tutor. A2 retains that path and excludes unrelated retrieval, scheduling and recorded-image exercises. Development added trace export, response validation, equation checks and a clearer practice-to-unaided flow. Original source fingerprints and the Lab4 commit are in docs/PROVENANCE.md; the original lab remains separate.

## Design choices and supporting evidence

Gradual mode requires a nonempty attempt before the first requested hint. Each subsequent request reveals one more checked step; immediate mode displays the same steps together. This preserves the combined comparison proposed in A1. Atkinson, Renkl and Merrill (2003) found transfer benefits from fading worked steps combined with self-explanation prompts, but their intervention does not establish the effect of this interface. Sale and Muldner (2019) found no significant overall learning difference between their hint conditions. These results support testing the choice without assuming that less assistance must improve learning.

Released steps remain visible, with progress and attempt feedback. Week 2’s working-memory and external-state concepts informed this choice: users should not need to remember previously released help (University of Birmingham, 2026). That possible benefit has not been measured. Written explanations remain ungraded. Optional equation checks test algebraic equivalence using exact arithmetic; they cannot assess why a learner chose an operation. Checking a line releases no worked step.

Scope disclosure and recovery follow Amershi et al.’s (2019) guidelines on capability clarity, correction and limiting services when uncertain. The header identifies fixed content and simulated responses. The revised backend checks the complete equation against the selected item before releasing any step. An incomplete equation produces an editable correction request. The retained baseline deliberately skips that check to demonstrate the defect; it is an inspection option, not evidence of an observed commercial-model failure. A restart establishes a new session so conditions and progress cannot silently mix.

Kim et al. (2009) reported an interaction between tutorial method and conceptual versus procedural knowledge. Accordingly, numeric correctness and equation equivalence are kept separate from conceptual understanding. The checker reduces each supported expression to a linear form and compares unique solutions. This is implemented reasoning over a restricted grammar, not language-model understanding. A future explanation task needs a scoring rubric and appropriate checking. A correct number or equivalent equation alone cannot establish understanding.

## Architecture and illustrated interaction

Figure 1 shows the boundaries. The browser sends the equation, condition and action to a local Python controller. algebra.py checks supported linear expressions; the authored catalog is also verified at startup. The controller passes checked data and a reveal count to an offline response function, validates the returned prefix and supplies its own acknowledgement. Unexpected output releases no new step. This applies Week 3’s distinction between model instructions, supplied data and application enforcement (University of Birmingham, 2026). The implemented checker and simulated response function are labelled separately.

Example 1 shows an equation check followed by one requested hint, contrasted with immediate display. Example 2 flags a changed solution and accepts a corrected equivalent line without revealing further help. Example 3 moves from a solved practice item to its paired unaided question and exports the trace. Answer checks use exact rational arithmetic. Injected response failure preserves earlier steps. Demo controls are folded away from the main learner flow.

![Architecture](figures/architecture.png)

![Interaction 1](figures/story-1.png)

![Interaction 2](figures/story-2.png)

![Interaction 3](figures/story-3.png)

## Development evidence and limits

Local traces contain timestamps, elapsed time, condition, event type, attempts, released-step counts, equation-check results and valid answer outcomes. A random trace identifier links a session without a name or email address. Free-text working stays in process memory and is excluded from saved JSONL and exported CSV. Server restart resets practice state; saved traces remain until deleted. Export is scoped to the active session. These records are technical interaction evidence, not a secure multi-user research dataset.

The timer begins when a practice session first records an event. It therefore excludes setup time and cannot establish total task effort. Restarting creates a different trace rather than silently appending a second condition. No automatic group allocation, participant consent workflow or effort questionnaire is implemented. These omissions matter when interpreting exported records: a sequence of successful software actions cannot be reported as an independently administered learning experiment.

The version passes 40 code tests and 32 browser checks. These cover authored answers and substitution checks, equivalent and incorrect lines, unsupported syntax, identical help content, response failures, session isolation, mobile layout and actual downloads. Demonstration files are labelled developer_demo or developer_check. They contain no participant observations. Review corrected malformed-answer scoring, declined-output release and stale feedback. A shared lock keeps state updates and traces consistent. Disk-write failure still permits CSV download. The expanded workflow and comparison setting were then checked in the browser. The README records reused work, assistance and corrections.

Bastani et al. (2025) motivate separating assisted from later unaided performance. Current unaided practice allows retries and immediate feedback, so it is not a controlled post-test. Equation feedback can be disabled in both conditions, with that setting recorded, to retain A1’s narrower comparison. A future study still needs suitable recruitment, prior-knowledge measurement, assigned conditions, fixed tasks, first-response scoring and effort measures. Its analysis must report uncertainty. The combined attempt requirement and release sequence cannot be separated. No learning improvement or retention benefit is claimed; docs/RESEARCH_PROTOCOL.md identifies these remaining gaps.

## AI assistance

OpenAI Codex assisted with implementation, tests, evidence capture, literature checks, drafting and language revision. Automated demonstrations are labelled separately from participant data. The README records the checks and changes.

## Repository and version

Local review release: a2-review-v4. GitHub account connected; repository creation and public repository/README links pending.

## References

Amershi, S. et al. (2019). Guidelines for human–AI interaction. Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems, pp. 1–13. https://doi.org/10.1145/3290605.3300233

Atkinson, R. K., Renkl, A. and Merrill, M. M. (2003). Transitioning from studying examples to solving problems: Effects of self-explanation prompts and fading worked-out steps. Journal of Educational Psychology, 95(4), pp. 774–783. https://doi.org/10.1037/0022-0663.95.4.774

Bastani, H. et al. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. Proceedings of the National Academy of Sciences, 122(26), e2422633122. https://doi.org/10.1073/pnas.2422633122

Kim, R. S., Weitz, R., Heffernan, N. T. and Krach, N. (2009). Tutored problem solving vs. “Pure” worked examples. Proceedings of the 31st Annual Meeting of the Cognitive Science Society, pp. 3121–3126. https://escholarship.org/uc/item/35w4h4zt

Koedinger, K. R. and Aleven, V. (2007). Exploring the assistance dilemma in experiments with Cognitive Tutors. Educational Psychology Review, 19(3), pp. 239–264. https://doi.org/10.1007/s10648-007-9049-0

Sale, K. and Muldner, K. (2019). Learning with an algebra computer tutor: What type of hint is best? Proceedings of the 41st Annual Meeting of the Cognitive Science Society, pp. 2708–2714. https://escholarship.org/uc/item/8gv8k0t5

University of Birmingham (2026). Intelligent Interactive Systems lecture materials: Week 2 Lecture 05 and Week 3 Lecture 09. https://canvas.bham.ac.uk/courses/90253/modules
