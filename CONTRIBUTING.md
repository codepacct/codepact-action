# Contributing to Codepact Action

Node.js 20 and a clone is the whole setup. There is no install step.

```bash
git clone https://github.com/codepacct/codepact-action.git
cd codepact-action
npm test
```

## Before you open a pull request

```bash
npm test
```

CI additionally runs the action against its own fixtures: `examples/clean` must
pass with `strict: true`, and `examples/broken` must fail. That self-test is the
real proof the action works, because it exercises the same code path a consumer
repository does.

## Rules of the repo

1. **Every change lands through a pull request**, including the maintainer's
   own.
2. **Do not fix analyzer bugs here.** `src/comments.js`, `src/parse.js` and
   `src/analyze.js` are vendored from `codepact-core`. Fix upstream, then port.
   See [VENDORING.md](VENDORING.md).
3. **No runtime dependencies.** A `using: node20` action has no install step, so
   a dependency would have to be committed. The action deliberately reads
   `INPUT_*` environment variables directly instead of using `@actions/core`.
4. **Annotation escaping needs a test.** An unescaped newline truncates a
   workflow command and the annotation silently loses everything after it, which
   is worse than no annotation. Any change to `src/annotate.js` needs a case in
   `test/annotate.test.js`.
5. **A false negative is a bug of the highest severity.** Teams gate merges on
   this action. Missing a real collision is worse than a noisy false positive.

## Reporting a problem

Open an issue with the smallest Rust snippet that reproduces it, the workflow
step you used, and the annotation you got or expected.
