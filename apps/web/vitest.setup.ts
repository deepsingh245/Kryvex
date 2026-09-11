import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// vitest.config.mts doesn't set test.globals:true, so @testing-library/react's
// own auto-cleanup (which only self-registers when it detects a *global*
// afterEach) never fires — without this, DOM from one `it()`'s render() call
// leaks into the next in the same file, letting `getByText`/`getByRole`
// spuriously match leftover elements from a prior test.
afterEach(cleanup);
