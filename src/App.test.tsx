import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("runs the built-in sample through the full report", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Or inspect the sample" }));

    expect(await screen.findByRole("heading", { name: "Quality overview" })).toBeInTheDocument();
    expect(screen.getByText("orders_export_august.csv")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Before and after analysis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Validation rules" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download clean CSV" })).toBeInTheDocument();
  });

  it("adds a custom validation rule", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Or inspect the sample" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add rule" }));

    expect(screen.getByText("1 active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove rule for order_id" })).toBeInTheDocument();
  });
});
