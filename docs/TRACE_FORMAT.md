# Trace fields and interpretation

The CSV is a technical trace. Each row is an operation in one practice session, not a participant record or independent outcome. The first event starts elapsed_ms, excluding setup or any future pre-test. A restart creates a different trace_id.

| Fields | Meaning |
| --- | --- |
| trace_id, run_kind, timestamp_utc | Random session identifier, inspection/developer origin and event time |
| elapsed_ms | Monotonic time since the session's first record |
| practice_problem, condition, version | Selected item, presentation mode and checked/intentional baseline version |
| equation_feedback | Whether optional equivalence feedback was allowed in this session |
| event | Requested action, including check_step, unassisted_check or unassisted_invalid |
| status, shown_steps, attempt_count | State after the operation, visible worked steps and recorded attempts |
| step_checks, step_equivalent | Equation-check count; this check's equivalence result, blank if unavailable or unrelated |
| answer_checks, final_correct | Valid practice-answer count and latest practice result; invalid input clears the latter |
| transfer_problem, correct | Unaided item and numeric correctness; invalid input has blank correctness |

step_equivalent compares unique solutions of supported linear equations. It does not grade an explanation or prove an appropriate sequence of learning. No raw working, explanation text, entered numeric answer or session access token is persisted in this schema. Conceptual scoring or participant linkage would need separately designed data handling.

developer_demo and developer_check rows are assistant-run demonstrations. Exclude them from any participant analysis. Current practice allows retries and immediate feedback, so the raw trace does not implement the proposed controlled post-test. File-write failure is reflected in the export response; the in-memory rows remain available to download.
