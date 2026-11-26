<p align="center">
  <img src="https://raw.githubusercontent.com/codepacct/codepact-core/main/assets/codepact-banner.svg" alt="Codepact" width="860">
</p>

# Codepact Action

Run the [Codepact](https://github.com/codepacct/codepact-core) error-code
integrity check in your contract repository's CI. Every finding is reported as a
GitHub annotations so reviewers can find issues in the build. Some collision
annotations currently point to the enum declaration rather than the variant;
see [issue #2](https://github.com/codepacct/codepact-action/issues/2).

No dependencies, no install step, no Rust toolchain required.

## Quick start

```yaml
name: Contract error codes

on: [pull_request]

jobs:
  codepact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codepacct/codepact-action@6f654d71348ac4da842c935391ce257284b83a5b
        with:
          paths: contracts/
```

This example pins the current pre-release commit; there is no `v1` tag yet.
The action fails when it detects a collision. It is a lexical check, not a
security audit: unsupported Rust syntax can result in missed findings.

## What it catches

| Rule | Severity | The mistake |
| --- | --- | --- |
| `duplicate-discriminant` | error | Two variants of one enum share a code. `rustc` catches this as E0081, but only after a full build. |
| `code-collision` | error | Two different contracts define the same code, so a caller cannot tell which one rejected the call. |
| `range-violation` | error | A code escaped the block its contract was allocated. |
| `range-overlap` | warning | Two enums are growing toward each other with no reserved gap. |
| `implicit-discriminant` | warning | A variant has no explicit code, so inserting a line above it silently renumbers it. |

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `paths` | `.` | Space or newline separated paths to scan. |
| `config` | _none_ | Path to a `codepact.config.json` declaring per-enum ranges and ignored rules. |
| `strict` | `false` | Treat warnings as failures. |
| `annotate` | `true` | Emit GitHub annotations on the diff. |
| `summary` | `true` | Write the registry table to the job summary. |
| `markdown-out` | _none_ | Also write the Markdown registry to this file. |
| `fail-on-findings` | `true` | Set to `false` to report without failing the build. |

## Outputs

| Output | Description |
| --- | --- |
| `errors` | Number of error-severity findings. |
| `warnings` | Number of warning-severity findings. |
| `enums` | Number of `#[contracterror]` enums discovered. |

## Reserving a code block per contract

Most collisions are really an allocation problem. Give each contract a range and
the action enforces it:

```json
{
  "ranges": {
    "TokenError": [100, 199],
    "RouterError": [200, 299],
    "FactoryError": [300, 399]
  }
}
```

```yaml
      - uses: codepacct/codepact-action@6f654d71348ac4da842c935391ce257284b83a5b
        with:
          paths: contracts/
          config: codepact.config.json
          strict: true
```

## Committing the registry

Generate a Markdown table of every error code in the workspace and keep it in
the repository, so integrators have something to read:

```yaml
      - uses: codepacct/codepact-action@6f654d71348ac4da842c935391ce257284b83a5b
        with:
          paths: contracts/
          markdown-out: docs/ERROR_CODES.md
```

## Adopting it on a codebase that already has collisions

Start with `fail-on-findings: false`. You get the annotations and the registry
without a red build, which gives you something to fix against instead of a
reason to delete the workflow. A proper baseline file is
[planned in `codepact-core`](https://github.com/codepacct/codepact-core/issues/4).

## How it works

The analyzer is lexical rather than a full Rust front end, which is what lets it
run with no toolchain. It ignores anything inside comments, string literals, raw
strings and character literals, so an attribute mentioned in a doc comment is
never mistaken for a real declaration.

The parser modules are vendored from `codepact-core` as readable CommonJS rather
than a minified bundle. See [VENDORING.md](VENDORING.md) for why, and for the
rules that keep the copy from diverging.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Every change lands through a pull
request, including the maintainer's own.

## License

[MIT](LICENSE)
