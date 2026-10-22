import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("runs the built-in sample through the full report", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Or inspect the sample" }));

    expect(await screen.findByRole("heading", { name: "Quality overview" })).toBeInTheDocument();
    expect(screen.getByText("orders_export_august.csv")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download clean CSV" })).toBeInTheDocument();
  });
});
