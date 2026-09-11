import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// See apps/web/vitest.setup.ts's identical comment: without test.globals:true,
// @testing-library/react's auto-cleanup never self-registers, so renders
// leak across `it()` blocks in the same file unless cleaned up explicitly.
afterEach(cleanup);
