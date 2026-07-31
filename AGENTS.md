# AGENTS.md

## Project Purpose

Luna is a Chrome extension for controlling videos on ordinary web pages with the keyboard.

The first release targets native HTML `<video>` elements. It must provide predictable controls without disrupting text input, website shortcuts, or video players that the extension cannot safely identify.

## Technology and Commands

- Framework: WXT on Manifest V3.
- UI: React.
- Bundler: Vite, provided by WXT.
- Styling: Tailwind CSS v4.
- Package manager: pnpm only. Do not use npm or yarn, and do not introduce another lockfile.

Use these commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm compile
```

## Current Architecture

- `entrypoints/content.ts` runs in matching web pages. It is responsible for finding and controlling the appropriate native video, and for listening to page keyboard events.
- `entrypoints/popup/` is the React settings and status interface. It must not manipulate page DOM directly; communicate with the content script when needed.
- `entrypoints/background.ts` is the extension service worker. Use it only for browser-wide work such as persisted settings, commands, or message routing.
- `wxt.config.ts` owns WXT, Vite, manifest, and permission configuration.

Keep one clear responsibility per file. Prefer small, pure functions for video selection and keyboard-action mapping; browser event wiring should remain thin.

## Video Control Rules

- Start with native `HTMLVideoElement` support. Do not add site-specific selectors or player integrations unless approved.
- Act on one deliberate target video. Prefer the focused, playing, or largest visible video only when the selection rule is documented and tested.
- Register keyboard listeners in the capture phase only when needed to intercept a supported shortcut before the page handles it.
- Never handle or prevent a shortcut while the user is typing in an `input`, `textarea`, `select`, or content-editable element.
- Call `preventDefault()` only after the extension has confirmed that it will perform a supported action on a target video.
- Do not log page content, keystrokes, or user data.
- Treat cross-origin iframes and DRM-controlled players as unsupported unless an approved change explicitly handles them.

## Workflow Rules

Before proposing or making code changes:

- Read this `AGENTS.md`.
- Read relevant project documentation, including `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, and `docs/context.md` when present.
- Inspect the existing implementation before proposing a solution.

Never modify code without the user's approval. Before implementation, explain:

- Files to be modified and what will change in each one.
- New, renamed, or deleted files.
- Risks, side effects, and breaking changes.
- The validation plan.

Wait for confirmation before creating or editing code. The user's explicit request to create or update documentation authorizes that documentation change only.

## Development Principles

- Make the smallest safe change that solves the approved task.
- Preserve existing behavior unless the task explicitly changes it.
- Avoid unrelated refactors, dependency changes, formatting changes, and renamed files.
- Reuse existing code and native browser APIs before adding a dependency or abstraction.
- Explain and obtain approval before adding, removing, or upgrading dependencies.
- Prefer standard Tailwind utilities such as `duration-400` over bracketed arbitrary values. Use bracket syntax only when no standard utility can express the required value.
- Keep source files under 300 lines where practical; split by responsibility, not merely line count.
- Do not hard-code secrets or expose sensitive values in logs.

## Code and Documentation Rules

- All code comments must be written in English.
- Every source file must have a concise English file-level comment explaining its purpose.
- TypeScript and React functions, classes, and methods require concise JSDoc. Include `@param` and `@returns` whenever applicable.
- Use configured import aliases for cross-directory imports and relative imports within a directory.
- Update durable documentation when a decision, architecture, or workflow changes.
- Create `docs/context.md` only with approval. Keep it concise and use `Completed`, `In Progress`, `Next Step`, and `Future Improvements` where applicable.

## Testing and Validation

- Add or update tests when behavior changes. Put tests in the root `tests/` directory when it exists or is approved for creation.
- Prefer pure tests for shortcut parsing, action mapping, target-video selection, and editable-element detection.
- Run the smallest relevant validation first, then run `pnpm compile` and `pnpm build` for extension changes.
- Report only validations that were actually run.
- Clearly list remaining manual checks. For video controls, manually verify a normal page video, an editable field, no-video pages, and a page with multiple videos.

## Change Summary

After every implementation:

- Begin with a concise overview of the complete change: what it adds or changes, its role in the overall architecture, and the user-visible result. Do not begin with an individual file or directory.
- List every modified file, new file, and new directory. Link each existing file and directory where possible.
- Organize the summary by changed file and link each existing file.
- State the responsibility of each changed file and each added or materially changed function.
- List automated validation commands actually run and their results.
- List every remaining manual test with its expected result.
- End with one Conventional Commits-style suggested commit message.
