# Project Guidelines — Emerging Tech ML Game

These rules are **mandatory** for the entire development session. Every code change, new feature, or refactor must comply.

---

## 1. Modular Code — Single Responsibility Principle

- Every file must have **one clear responsibility**.
- No file may exceed **500 lines**. If it approaches that limit, split it.
- Each Phaser Scene lives in its own file.
- Shared logic (scoring, state, API calls) goes in `/src/core/`.
- UI components (HUD, menus, dialogs) go in `/src/ui/`.
- Helper/utility functions go in `/src/utils/`.
- Chapter-specific game logic goes in `/src/chapters/<chapter-name>/`.

## 2. Explicit Architecture — Document Before You Build

- Before implementing any new feature or chapter, **document the data flow and state management** in `/docs/` first.
- Every chapter must have a brief design note describing: inputs, outputs, game mechanics, and how state is managed.
- The game's global state shape must be defined and maintained in `/src/core/GameState.js`.

## 3. Rebuild Over Patching

- If a component or mechanic becomes unstable after **more than 2 fix attempts**, stop patching.
- **Rebuild** the component from scratch with a fresh, minimal scope.
- Delete the broken code entirely — do not leave dead code behind.

## 4. No Local Assets

- **Do not store image/sprite assets locally** in the repo.
- Use dynamic image APIs for all visuals:
  - **RoboHash** (`https://robohash.org/`) for character/avatar images.
  - **Placehold.co** (`https://placehold.co/`) for placeholder UI graphics.
- Audio or other non-image assets may be stored in `/public/` only if no API alternative exists.

## 5. Focused Tooling

- Keep external dependencies to the **minimum necessary** (Phaser + Vite core).
- Do not add libraries "just in case" — only install when actively needed.
- Avoid unnecessary MCP or tool integrations that add context overhead.

## 6. Code Style

- Use **ES Modules** (`import`/`export`) everywhere.
- Use `const` by default; `let` only when reassignment is required; never `var`.
- Descriptive naming: `calculateScore()`, not `calc()`.
- No console.log in committed code — use a debug utility if needed.

## 7. Question Bank Format

- All question data lives in `/docs/` as **JSON files**.
- Each chapter has its own JSON file: `chapter-1-questions.json`, etc.
- Schema per question:
  ```json
  {
    "id": "c1-q01",
    "chapter": 1,
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "B",
    "explanation": "..."
  }
  ```

## 8. Git Discipline

- Commit after every meaningful, working milestone.
- Commit messages follow: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Never commit broken code to `main`.

---

**These rules are non-negotiable. When in doubt, keep it simple and small.**
