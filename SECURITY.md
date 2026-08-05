# Security Policy

## Scope

This action reads Rust source files in the workspace and writes annotations, a
job summary and optionally one Markdown file. It makes no network calls,
executes nothing from the files it reads, and has no dependencies.

Security-relevant issues we want to hear about:

- A crafted source file that hangs the parser or exhausts runner memory.
- A `markdown-out` or `config` value that causes a write outside the workspace.
- Annotation content that escapes the workflow command format.
- A **false negative**: a real code collision the action fails to report. Because
  teams gate merges on this check, a missed collision is treated as a security
  issue rather than an ordinary bug.

## Reporting

Use the **Report a vulnerability** button on this repository's Security tab.
Please include the smallest workflow and input that reproduces the problem.

Expect an acknowledgement within 72 hours and an assessment within 7 days. The
report stays private until a fix is on `main`, and you will be credited unless
you ask otherwise.
