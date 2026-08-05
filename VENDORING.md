# Why the analyzer is vendored here

`src/comments.js`, `src/parse.js` and `src/analyze.js` are copies of the same
modules in [`codepact-core`](https://github.com/codepacct/codepact-core),
converted from ES modules to CommonJS.

This is deliberate, and it is temporary.

## The constraint

A GitHub Action declared as `using: node20` runs the entry file directly on the
runner. There is no install step, so the action cannot depend on an npm package
unless that package is committed into the repository. The usual answer is to
commit a bundler's output to `dist/`, which means reviewing minified generated
code in every pull request.

Since the analyzer has no dependencies of its own and is a few hundred lines,
committing readable source is the more honest option: what you review is what
runs.

## The rules while it stays this way

1. **Do not fix a parser or rule bug here.** Fix it in `codepact-core` first,
   then copy the change across in a separate pull request that says which
   upstream commit it tracks. A divergent copy is worse than no copy.
2. **Files that may be edited freely here**: `src/action.js`, `src/inputs.js`,
   `src/annotate.js`, `src/registry.js`. These are action-specific and have no
   upstream counterpart.
3. **Behaviour must stay identical.** The workflow in `.github/workflows/ci.yml`
   runs this action against `examples/clean` and `examples/broken`, the same
   fixtures `codepact-core` uses, so a silent divergence fails CI.

## The exit

Once `@codepact/core` is published to npm, the vendored files are deleted and
replaced with a dependency plus a committed lockfile. Tracked as an issue.
