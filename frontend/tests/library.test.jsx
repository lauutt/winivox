import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LibraryPage from "../src/LibraryPage.jsx";

describe("LibraryPage", () => {
  it("renders login required when logged out", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LibraryPage />);
    const message = await screen.findByText("Necesitas iniciar sesion");
    expect(message).toBeTruthy();
  });
});
