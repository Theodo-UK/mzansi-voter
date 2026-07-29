import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemInput } from "@/app/components/ItemDialog";
import type { GroceryItem, VoteValue } from "@/lib/voting";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: "member" | "admin";
};

export type ShoppingData = {
  user: AppUser;
  groupId: string;
  groupName: string;
  retailer: string;
  budgetCents: number;
  nextOrderDate: string;
  cutoffTime: string;
  items: GroceryItem[];
};

type ItemRow = {
  id: string;
  name: string;
  price_cents: number;
  product_url: string;
  preview_image_path: string | null;
  purchase_type: "recurring" | "one_off";
  locked: boolean;
  skipped: boolean;
  created_at: string;
  creator: { display_name: string } | Array<{ display_name: string }> | null;
  votes:
    | Array<{
        user_id: string;
        value: VoteValue;
        voter:
          | { display_name: string }
          | Array<{ display_name: string }>
          | null;
      }>
    | null;
};

function firstRelated(
  relation: { display_name: string } | Array<{ display_name: string }> | null,
) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export async function loadShoppingData(
  client: SupabaseClient,
  userId: string,
  email: string,
): Promise<ShoppingData> {
  const [profileResult, membershipResult] = await Promise.all([
    client.from("profiles").select("display_name").eq("id", userId).single(),
    client
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", userId)
      .single(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const groupId = membershipResult.data.group_id as string;
  const [groupResult, itemResult] = await Promise.all([
    client
      .from("groups")
      .select("name, retailer, budget_cents, next_order_date, cutoff_time")
      .eq("id", groupId)
      .single(),
    client
      .from("items")
      .select(
        `
          id,
          name,
          price_cents,
          product_url,
          preview_image_path,
          purchase_type,
          locked,
          skipped,
          created_at,
          creator:profiles!items_created_by_fkey(display_name),
          votes(
            user_id,
            value,
            voter:profiles!votes_user_id_fkey(display_name)
          )
        `,
      )
      .eq("group_id", groupId),
  ]);

  if (groupResult.error) throw groupResult.error;
  if (itemResult.error) throw itemResult.error;

  const items = (itemResult.data as unknown as ItemRow[]).map((row) => {
    const previewImagePath = row.preview_image_path ?? undefined;
    const previewImageUrl = previewImagePath
      ? client.storage.from("product-previews").getPublicUrl(previewImagePath)
          .data.publicUrl
      : undefined;

    return {
      id: row.id,
      name: row.name,
      priceCents: row.price_cents,
      productUrl: row.product_url,
      previewImagePath,
      previewImageUrl,
      purchaseType: row.purchase_type,
      locked: row.locked,
      skipped: row.skipped,
      createdAt: row.created_at,
      createdBy: firstRelated(row.creator)?.display_name ?? "Unknown",
      votes: (row.votes ?? []).map((vote) => ({
        userId: vote.user_id,
        displayName: firstRelated(vote.voter)?.display_name ?? "Unknown",
        value: vote.value,
      })),
    };
  });

  return {
    user: {
      id: userId,
      email,
      displayName: profileResult.data.display_name as string,
      role: membershipResult.data.role as "member" | "admin",
    },
    groupId,
    groupName: groupResult.data.name as string,
    retailer: groupResult.data.retailer as string,
    budgetCents: groupResult.data.budget_cents as number,
    nextOrderDate: groupResult.data.next_order_date as string,
    cutoffTime: groupResult.data.cutoff_time as string,
    items,
  };
}

export async function saveItem(
  client: SupabaseClient,
  groupId: string,
  userId: string,
  input: ItemInput,
  itemId?: string,
  existingItem?: Pick<GroceryItem, "productUrl" | "previewImagePath">,
) {
  let previewImagePath =
    existingItem?.productUrl === input.productUrl
      ? (existingItem.previewImagePath ?? null)
      : null;

  if (
    !existingItem ||
    existingItem.productUrl !== input.productUrl ||
    !existingItem.previewImagePath
  ) {
    const previewResult = await client.functions.invoke("product-preview", {
      body: { url: input.productUrl },
    });
    if (
      !previewResult.error &&
      typeof previewResult.data?.previewImagePath === "string"
    ) {
      previewImagePath = previewResult.data.previewImagePath;
    }
  }

  const payload = {
    name: input.name,
    price_cents: Math.round(input.price * 100),
    product_url: input.productUrl,
    preview_image_path: previewImagePath,
    purchase_type: input.purchaseType,
  };

  if (itemId) {
    const { error } = await client.from("items").update(payload).eq("id", itemId);
    if (error) throw error;
    return itemId;
  }

  const { data, error } = await client
    .from("items")
    .insert({ ...payload, group_id: groupId, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function persistVote(
  client: SupabaseClient,
  itemId: string,
  userId: string,
  value: VoteValue | null,
) {
  if (value === null) {
    const { error } = await client
      .from("votes")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("votes")
    .upsert({ item_id: itemId, user_id: userId, value });
  if (error) throw error;
}

export async function deleteItem(client: SupabaseClient, itemId: string) {
  const { error } = await client.from("items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function clearItems(
  client: SupabaseClient,
  groupId: string,
) {
  const { error } = await client
    .from("items")
    .delete()
    .eq("group_id", groupId);
  if (error) throw error;
}

export async function setItemFlags(
  client: SupabaseClient,
  itemId: string,
  patch: Partial<Pick<GroceryItem, "locked" | "skipped">>,
) {
  const { error } = await client.from("items").update(patch).eq("id", itemId);
  if (error) throw error;
}

export async function updateGroupSettings(
  client: SupabaseClient,
  groupId: string,
  settings: {
    retailer: string;
    budgetCents: number;
    nextOrderDate: string;
    cutoffTime: string;
  },
) {
  const { error } = await client
    .from("groups")
    .update({
      retailer: settings.retailer,
      budget_cents: settings.budgetCents,
      next_order_date: settings.nextOrderDate,
      cutoff_time: settings.cutoffTime,
    })
    .eq("id", groupId);
  if (error) throw error;
}

export async function startNextCycle(
  client: SupabaseClient,
  groupId: string,
  acceptedItemIds: string[],
) {
  const { error } = await client.rpc("start_next_cycle", {
    target_group_id: groupId,
    accepted_item_ids: acceptedItemIds,
  });
  if (error) throw error;
}

export async function loadGroupAdminEmails(
  client: SupabaseClient,
  groupId: string,
) {
  const { data, error } = await client
    .from("group_admin_emails")
    .select("email")
    .eq("group_id", groupId)
    .order("email");
  if (error) throw error;
  return data.map(({ email }) => email as string);
}

export async function addGroupAdmin(
  client: SupabaseClient,
  groupId: string,
  email: string,
) {
  const { data, error } = await client.rpc("add_group_admin", {
    target_group_id: groupId,
    target_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data === true;
}

export async function removeGroupAdmin(
  client: SupabaseClient,
  groupId: string,
  email: string,
) {
  const { data, error } = await client.rpc("remove_group_admin", {
    target_group_id: groupId,
    target_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data === true;
}
