import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  addItemComment,
  addGroupAdmin,
  deleteItemComment,
  loadGroupAdminEmails,
  removeGroupAdmin,
  updateItemComment,
} from "./repository";

describe("comments repository", () => {
  it("stores a trimmed comment for the current user", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { from } as unknown as SupabaseClient;

    await addItemComment(
      client,
      "item-one",
      "user-one",
      "  Looks good 👍  ",
    );

    expect(from).toHaveBeenCalledWith("item_comments");
    expect(insert).toHaveBeenCalledWith({
      item_id: "item-one",
      author_id: "user-one",
      body: "Looks good 👍",
    });
  });

  it("updates and deletes a comment by id", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockReturnValue({ eq: deleteEq });
    const from = vi.fn().mockReturnValue({ update, delete: remove });
    const client = { from } as unknown as SupabaseClient;

    await updateItemComment(client, "comment-one", "  Better wording  ");
    await deleteItemComment(client, "comment-one");

    expect(update).toHaveBeenCalledWith({ body: "Better wording" });
    expect(updateEq).toHaveBeenCalledWith("id", "comment-one");
    expect(deleteEq).toHaveBeenCalledWith("id", "comment-one");
  });
});

describe("admin settings repository", () => {
  it("loads the configured admin emails for the active group", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { email: "dale.maske@theodo.com" },
        { email: "fixture.admin@theodo.com" },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;

    await expect(loadGroupAdminEmails(client, "group-one")).resolves.toEqual([
      "dale.maske@theodo.com",
      "fixture.admin@theodo.com",
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
