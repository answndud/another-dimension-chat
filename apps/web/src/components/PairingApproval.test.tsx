import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PairingApproval } from "./PairingApproval";

describe("PairingApproval", () => {
  const defaultProps = {
    safetyNumber: "12345 67890 abcde fghij klmno",
    peerAccountId: "ad1pktest",
    busy: false,
    onConfirm: () => {},
    onReject: () => {},
  };

  it("shows safety number", () => {
    render(<PairingApproval {...defaultProps} />);
    expect(screen.getByText(/12345/)).toBeTruthy();
  });

  it("disables approve until checkbox is checked", () => {
    render(<PairingApproval {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /승인/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables approve after checkbox", () => {
    render(<PairingApproval {...defaultProps} />);
    fireEvent.click(screen.getByRole("checkbox"));
    const btn = screen.getByRole("button", { name: /✓ 승인/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls onReject when reject clicked", () => {
    let rejected = false;
    render(<PairingApproval {...defaultProps} onReject={() => { rejected = true; }} />);
    fireEvent.click(screen.getByText("거절"));
    expect(rejected).toBe(true);
  });
});
