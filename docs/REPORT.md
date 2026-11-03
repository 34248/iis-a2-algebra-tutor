# Controlled Help in an Algebra Tutoring Prototype

Formatted Word/PDF count: 1166 total; abstract 118; main text 1048 including headings, AI acknowledgement and repository status. Figure labels/captions and references excluded.

## Abstract

This project explores how an introductory algebra tutor can offer help while leaving students an opportunity to attempt a problem. It develops the question from A1 into a local browser prototype with two conditions: attempt-first gradual release and an immediate worked solution. Both conditions use identical checked equations and solution steps. The interface supports correction of incomplete input, numeric answer checking and separate practice without hints. An A2 extension records local interaction traces and exports session CSV files without saving free-text attempts. The tutor response boundary is simulated using fixed content; no live language model is connected. Automated checks establish the demonstrated software behaviour, not learning effectiveness. Participant comparison, prior-knowledge assessment and delayed retention testing remain future work.

## Problem and scope

Completing an equation with assistance does not establish that a learner can solve the next equation independently. A1 therefore proposed comparing help presentation while holding solution content fixed. Koedinger and Aleven’s (2007) assistance dilemma motivates preserving opportunities to think alongside access to guidance. The intended users are university students practising introductory algebra. The current scope is deliberately small: two checked practice equations and two different unaided questions. It demonstrates an interaction choice that could later be studied; it does not offer unrestricted algebra tutoring.

The starting point was the A1-aligned Lab4 project, created after the earlier email exercise. A2 retains its tutor path and removes the unrelated course-policy retrieval, scheduling and recorded-image exercises from this focused package. That change keeps the design argument about algebra assistance. Source-file fingerprints and the original Lab4 commit are recorded in docs/PROVENANCE.md; the original lab remains separate.

## Design choices and supporting evidence

Gradual mode requires a nonempty attempt before the first requested hint. Each subsequent request reveals one more checked step; immediate mode displays the same steps together. This preserves the combined comparison proposed in A1. Atkinson, Renkl and Merrill (2003) found transfer benefits from fading worked steps combined with self-explanation prompts, but their intervention does not establish the effect of this interface. Sale and Muldner (2019) found no significant overall learning difference between their hint conditions. These results support testing the choice without assuming that less assistance must improve learning.

The interface leaves released steps visible, shows progress and acknowledges recorded attempts. Week 2’s working-memory and external-state concepts informed this choice: users should not have to remember which help has already appeared (University of Birmingham, 2026). Persistent steps may reduce avoidable checking, although that benefit has not been measured. An attempt is recorded rather than judged for reasoning quality. A short or unhelpful entry can still unlock a hint; claiming intelligent assessment of that reasoning would misrepresent the implementation.

Scope disclosure and recovery follow Amershi et al.’s (2019) guidelines on capability clarity, correction and limiting services when uncertain. The header identifies fixed content and simulated responses. The revised backend checks the complete equation against the selected item before releasing any step. An incomplete equation produces an editable correction request. The retained baseline deliberately skips that check to demonstrate the defect; it is an inspection option, not evidence of an observed commercial-model failure. A restart establishes a new session so conditions and progress cannot silently mix.

Kim et al. (2009) reported an interaction between tutorial method and conceptual versus procedural knowledge. This informs the distinction between checking a numeric answer and checking understanding of a step. The prototype implements the first. A future explanation task would need a scoring rubric and appropriate checking before its scores could be compared. Keeping that boundary explicit avoids treating a correct number, possibly obtained after repeated attempts, as a complete measure of understanding.

## Architecture and illustrated interaction

Figure 1 shows the implemented boundaries. The browser sends an equation, condition and action to a local Python controller. It holds session state and passes checked problem data and the permitted reveal count to an offline response function, which returns a prefix of the stored steps. Before display, the controller validates response status and steps and supplies its own acknowledgement. Unexpected output releases no new step. This applies Week 3’s distinction between model instructions, supplied data and the application’s enforcement of an interaction contract (University of Birmingham, 2026).

Example 1 contrasts a recorded attempt followed by one requested hint with the complete immediate solution. Example 2 shows the incomplete input being blocked and a corrected equation restarting successfully. Example 3 checks a new equation without revealing worked steps, then exports the interaction trace. Numeric correctness checks use exact rational arithmetic. They do not score conceptual explanations. An injected unavailable response retains earlier steps and reports the interruption, allowing inspection of recovery without pretending that a successful new answer arrived.

![System architecture](figures/architecture.png)

![Interaction example 1](figures/story-1.png)

![Interaction example 2](figures/story-2.png)

![Interaction example 3](figures/story-3.png)

## Development evidence and limits

The A2 extension adds a session trace containing timestamps, elapsed time, condition, event type, attempt count, released-step count and an unaided-answer result. A random trace identifier links events without a name or email address. Free-text attempts remain in process memory and are excluded from saved JSONL and exported CSV. Practice state resets when the server restarts; local traces persist until deleted. Export is scoped to the active session. This is a local inspection tool, not a secure multi-user research platform.

The timer begins when a practice session first records an event. It therefore excludes setup time and cannot establish total task effort. Restarting creates a different trace rather than silently appending a second condition. No automatic group allocation, participant consent workflow or effort questionnaire is implemented. These omissions matter when interpreting exported records: a sequence of successful software actions cannot be reported as an independently administered learning experiment.

The checked version passes 27 code tests and 22 browser checks. These cover identical mode content, rejected input, session separation, injected response failures and actual CSV downloads. Two demonstration CSV files are labelled developer_demo; developer checks use developer_check. They contain no participant observations. Review found that malformed numeric entries were scored as wrong and declined responses could release steps. Invalid entries now have a separate event; response validation rejects unsuitable output. A shared lock keeps state changes and trace recording together under overlapping requests. Browser checks also cover stale feedback after editing an answer and CSV download when a server copy cannot be saved. The README records these corrections.

Bastani et al. (2025) motivate separating assisted performance from later unaided performance. The present correctness-only practice route makes that distinction visible, but repeated answers and self-selection mean it is not a controlled post-test. A future approved study would need appropriate recruitment, prior-knowledge measurement, assignment and scoring, with time, effort and uncertainty reported. Small samples would limit conclusions. Because the two conditions change both attempt requirement and release sequence, their effects could not be separated. No learning improvement, equivalence or retention benefit is claimed.

## AI assistance

OpenAI Codex assisted with implementation, tests, evidence capture, literature checks, drafting and language revision. Automated demonstrations are labelled separately from participant data. The README records the checks and changes.

## Repository and submitted version

Local review release: a2-review-v3. GitHub account connected; repository creation, publication and public README links pending.

## References

Amershi, S. et al. (2019). Guidelines for human–AI interaction. Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems, pp. 1–13. https://doi.org/10.1145/3290605.3300233

Atkinson, R. K., Renkl, A. and Merrill, M. M. (2003). Transitioning from studying examples to solving problems: Effects of self-explanation prompts and fading worked-out steps. Journal of Educational Psychology, 95(4), pp. 774–783. https://doi.org/10.1037/0022-0663.95.4.774

Bastani, H. et al. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. Proceedings of the National Academy of Sciences, 122(26), e2422633122. https://doi.org/10.1073/pnas.2422633122

Kim, R. S., Weitz, R., Heffernan, N. T. and Krach, N. (2009). Tutored problem solving vs. “Pure” worked examples. Proceedings of the 31st Annual Meeting of the Cognitive Science Society, pp. 3121–3126. https://escholarship.org/uc/item/35w4h4zt

Koedinger, K. R. and Aleven, V. (2007). Exploring the assistance dilemma in experiments with Cognitive Tutors. Educational Psychology Review, 19(3), pp. 239–264. https://doi.org/10.1007/s10648-007-9049-0

Sale, K. and Muldner, K. (2019). Learning with an algebra computer tutor: What type of hint is best? Proceedings of the 41st Annual Meeting of the Cognitive Science Society, pp. 2708–2714. https://escholarship.org/uc/item/8gv8k0t5

University of Birmingham (2026). Intelligent Interactive Systems lecture materials: Week 2 Lecture 05 and Week 3 Lecture 09. https://canvas.bham.ac.uk/courses/90253/modules
