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
        if (String(url).includes("/feed/low-serendipia")) {
          return Promise.resolve({
            ok: true,
            json: async () => []
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
    expect(screen.getByText("Elegi un tema")).toBeTruthy();
    expect(screen.getByText("Historias recientes")).toBeTruthy();
    expect(screen.getByText("Recientes")).toBeTruthy();
    expect(screen.getByText("Mas votadas")).toBeTruthy();
    expect(screen.getByText("Temporizador")).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
