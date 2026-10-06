import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeChatQuota } from "@/lib/chat/quota";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const abortSignal = vi.fn();
const rpc = vi.fn(() => ({ abortSignal }));
beforeEach(() => { vi.mocked(createClient).mockResolvedValue({ rpc } as never); });

describe("chat quota", () => {
  it.each([true, false])("returns the authenticated database decision %s", async (data) => {
    abortSignal.mockResolvedValue({ data, error: null });
    const signal = new AbortController().signal;
    expect(await consumeChatQuota(signal)).toBe(data);
    expect(rpc).toHaveBeenCalledWith("consume_chat_quota");
    expect(abortSignal).toHaveBeenCalledWith(signal);
  });
  it.each([
    { data: true, error: { message: "private" } }, { data: null, error: null },
    { data: "true", error: null }, { data: undefined, error: null },
  ])("fails closed for an error or invalid decision", async (result) => {
    abortSignal.mockResolvedValue(result);
    await expect(consumeChatQuota(new AbortController().signal)).rejects.toThrow("Chat quota unavailable.");
  });
});
