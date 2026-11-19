---
name: coding-guidelines
description: "Use for implementation, debugging, refactoring, and code changes that require cautious assumptions, simple solutions, surgical edits, measurable success criteria, and explicit verification."
---

# Coding Guidelines

## Goal

Implement the smallest complete change that satisfies the request. Prefer correctness and simplicity over speed.

## Think Before Coding

- State assumptions explicitly. If there is uncertainty, ask before changing code.
- If multiple interpretations are plausible, present them and do not choose silently.
- Push back on unnecessary complexity and identify a simpler valid approach.
- Stop and name the confusion if requirements or existing behavior are unclear.

## Simplicity First

- Do not add features, configuration, abstractions, or error handling outside the request.
- Do not create abstractions for single-use code.
- If a solution can be substantially smaller and equally clear, prefer it.
- Before editing, ask whether a senior engineer would consider the approach overcomplicated.

## Surgical Changes

- Touch only files and lines required for the request.
- Match the existing style and established project patterns.
- Do not improve adjacent code, formatting, comments, or unrelated dead code.
- When a change makes an import, variable, or function unused, remove only that newly orphaned code.
- Do not remove pre-existing dead code unless it was explicitly requested.
- Keep every changed line traceable to the user's goal.

## Goal-Driven Execution

1. Define a concrete success criterion before implementation.
2. For multi-step work, state a short plan with verification for each step.
3. Add or run the smallest test or check that proves the requested behavior.
4. Loop until the criterion is verified; do not substitute subjective claims of success.

Examples:

- "Add validation" → test invalid inputs, then make those tests pass.
- "Fix the bug" → write or run a reproduction, fix the root cause, then rerun it.
- "Refactor X" → verify the relevant tests pass before and after.

## Clarification

Ask before implementation when uncertainty could materially change:

- scope;
- expected behavior;
- compatibility constraints;
- or the chosen approach among meaningfully different options.

For trivial tasks, use reasonable judgment instead of adding a needless question.

## Verification

- Run the narrowest existing test, build, lint, or type check that covers the change.
- If a check fails, report the exact failure and fix the relevant touched slice.
- Never claim success for skipped or failed validation.

## Reporting

Summarize:

- changed files;
- resulting behavior;
- exact validation performed;
- and blockers, if any.

Keep the report concise.
