import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  addGroupAdmin,
  loadGroupAdminEmails,
  removeGroupAdmin,
} from "./repository";

describe("admin settings repository", () => {
  it("loads the configured admin emails for the active group", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { email: "dale.maske@theodo.com" },
        { email: "liam.hitchcock@theodo.com" },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;

    await expect(loadGroupAdminEmails(client, "group-one")).resolves.toEqual([
      "dale.maske@theodo.com",
      "liam.hitchcock@theodo.com",
    ]);
    expect(from).toHaveBeenCalledWith("group_admin_emails");
    expect(eq).toHaveBeenCalledWith("group_id", "group-one");
    expect(order).toHaveBeenCalledWith("email");
  });

  it("normalises an allowed email before requesting promotion", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      addGroupAdmin(client, "group-one", " Fabien.Zuchet@ALEIOS.COM "),
    ).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("add_group_admin", {
      target_group_id: "group-one",
      target_email: "fabien.zuchet@aleios.com",
    });
  });

  it("surfaces rejected admin changes", async () => {
    const failure = new Error("Only group admins can add another admin.");
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: failure }),
    } as unknown as SupabaseClient;

    await expect(
      addGroupAdmin(client, "group-one", "person@theodo.com"),
    ).rejects.toBe(failure);
  });

  it("normalises an email before requesting demotion", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      removeGroupAdmin(client, "group-one", " Dale.Maske@THEODO.COM "),
    ).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("remove_group_admin", {
      target_group_id: "group-one",
      target_email: "dale.maske@theodo.com",
    });
  });
});
