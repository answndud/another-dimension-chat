import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InvitePanel } from "./InvitePanel";

describe("InvitePanel", () => {
  it("shows create invite button", () => {
    render(
      <InvitePanel invite={null} busy={false} hasContacts={false} onCreateInvite={() => {}} onConsumeInvite={() => {}} />
    );
    expect(screen.getByText("초대 코드 만들기")).toBeTruthy();
  });

  it("disables button when busy", () => {
    render(
      <InvitePanel invite={null} busy={true} hasContacts={false} onCreateInvite={() => {}} onConsumeInvite={() => {}} />
    );
    const btn = screen.getByText("생성 중…") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows invite code when available", () => {
    render(
      <InvitePanel invite={{ invite_code: "ABCD-1234" }} busy={false} hasContacts={false} onCreateInvite={() => {}} onConsumeInvite={() => {}} />
    );
    expect(screen.getByDisplayValue("ABCD-1234")).toBeTruthy();
  });

  it("shows consume input when no contacts", () => {
    render(
      <InvitePanel invite={null} busy={false} hasContacts={false} onCreateInvite={() => {}} onConsumeInvite={() => {}} />
    );
    expect(screen.getByPlaceholderText("받은 초대 코드를 붙여넣으세요")).toBeTruthy();
  });

  it("hides consume input when contacts exist", () => {
    render(
      <InvitePanel invite={null} busy={false} hasContacts={true} onCreateInvite={() => {}} onConsumeInvite={() => {}} />
    );
    expect(screen.queryByPlaceholderText("받은 초대 코드를 붙여넣으세요")).toBeNull();
  });
});
