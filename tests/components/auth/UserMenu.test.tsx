import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signInWithGitHub, signOut } from "@/app/auth/actions";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/components/auth/UserMenu";

vi.mock("@/app/auth/actions", () => import("../../helpers/mockNext").then((m) => m.authActionsMock()));

describe("UserMenu", () => {
  it("offers GitHub sign-in when signed out", () => {
    render(createElement(UserMenu, { user: null, next: "/saved" }));
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    expect(document.querySelector('input[name="next"]')).toHaveValue("/saved");
  });

  it("defaults the next field to the home page when none is given", () => {
    render(createElement(UserMenu, { user: null }));
    expect(document.querySelector('input[name="next"]')).toHaveValue("/");
  });

  it("shows the user linked to their profile and sign-out when signed in", () => {
    const { rerender } = render(
      createElement(UserMenu, { user: { id: "1", name: "octocat", avatarUrl: "https://a/img.png" } })
    );
    expect(screen.getByRole("link", { name: "octocat" })).toHaveAttribute("href", "/profile");
    expect(document.querySelector("img")).toHaveAttribute("src", "https://a/img.png");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();

    rerender(createElement(UserMenu, { user: { id: "1", name: "octocat", avatarUrl: null } }));
    expect(document.querySelector("img")).toBeNull();
  });
  it("shows sign-in progress and prevents duplicate submissions without losing the return path", async () => {
    let finish!: () => void;
    vi.mocked(signInWithGitHub).mockImplementationOnce(() => new Promise<never>((resolve) => {
      finish = () => resolve(undefined as never);
    }));
    render(createElement(UserMenu, { user: null, next: "/saved" }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign in with GitHub" }));
    const pending = screen.getByRole("button", { name: "Connecting to GitHub…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    await user.click(pending);
    expect(signInWithGitHub).toHaveBeenCalledTimes(1);
    expect(vi.mocked(signInWithGitHub).mock.calls[0][0]?.get("next")).toBe("/saved");
    await act(async () => finish());
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeEnabled();
  });

  it("shows sign-out progress and prevents duplicate submissions", async () => {
    let finish!: () => void;
    vi.mocked(signOut).mockImplementationOnce(() => new Promise<never>((resolve) => {
      finish = () => resolve(undefined as never);
    }));
    render(createElement(UserMenu, { user: { id: "1", name: "octocat", avatarUrl: null } }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    const pending = screen.getByRole("button", { name: "Signing out…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    await user.click(pending);
    expect(signOut).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

});
