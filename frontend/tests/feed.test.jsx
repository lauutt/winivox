import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FeedPage from "../src/FeedPage.jsx";

describe("FeedPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (String(url).includes("/feed/tags")) {
          return Promise.resolve({
            ok: true,
            json: async () => ["relato personal", "turno de noche"]
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      })
    );
  });

  it("renders tag filters and feed header", async () => {
    render(<FeedPage />);
    expect(screen.getByText("Tune by mood")).toBeTruthy();
    expect(screen.getByText("Latest anonymous drops")).toBeTruthy();
    expect(screen.getByText("Latest")).toBeTruthy();
    expect(screen.getByText("Top")).toBeTruthy();
    expect(screen.getByText("Sleep")).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
