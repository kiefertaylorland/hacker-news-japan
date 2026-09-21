import { render, screen } from "@testing-library/react";
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

  it("shows the user, a saved link, and sign-out when signed in", () => {
    const { rerender } = render(
      createElement(UserMenu, { user: { id: "1", name: "octocat", avatarUrl: "https://a/img.png" } })
    );
    expect(screen.getByText("octocat")).toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute("src", "https://a/img.png");
    expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute("href", "/saved");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();

    rerender(createElement(UserMenu, { user: { id: "1", name: "octocat", avatarUrl: null } }));
    expect(document.querySelector("img")).toBeNull();
  });
});
