import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import UploadPage from "../src/UploadPage.jsx";

describe("UploadPage", () => {
  it("renders auth gate when logged out", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<UploadPage />);
    const message = await screen.findByText("Login required");
    expect(message).toBeTruthy();
  });
});
