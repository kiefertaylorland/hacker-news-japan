import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "@/hooks/useDebounce";

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function expectSettlesAt(result: { current: string }, before: string, after: string) {
  advance(299);
  expect(result.current).toBe(before);
  advance(1);
  expect(result.current).toBe(after);
}

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns the current value immediately", () => {
    const { result } = renderHook(() => useDebounce("tokyo"));
    expect(result.current).toBe("tokyo");
  });

  it("debounces updates until the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "tokyo", delay: 300 } }
    );

    rerender({ value: "osaka", delay: 300 });
    expect(result.current).toBe("tokyo");

    expectSettlesAt(result, "tokyo", "osaka");
  });

  it("cancels stale debounce timers on rerender", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: "tokyo" } }
    );

    rerender({ value: "kyoto" });
    advance(150);
    rerender({ value: "nagoya" });

    expectSettlesAt(result, "tokyo", "nagoya");
  });
});
