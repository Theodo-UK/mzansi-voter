"use client";

import { useEffect, useMemo } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { MzansiVoterApp, type ShoppingPersistence } from "./MzansiVoterApp";
import { AuthScreen } from "./components/AuthScreen";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadProductAvailability } from "@/lib/supabase/availability";
import { isAvailabilityStale } from "@/lib/availability";
import {
  addItemComment,
  clearItems,
  deleteItem,
  loadShoppingData,
  persistVote,
  saveItem,
  setItemFlags,
  startNextCycle,
  updateGroupSettings,
} from "@/lib/supabase/repository";
import { parseCheckersProductUrl } from "@/supabase/functions/_shared/product-metadata";

type AuthenticatedUser = {
  id: string;
  email: string;
};

function ConnectedApp({ user }: { user: AuthenticatedUser }) {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const queryClient = useMemo(() => new QueryClient(), []);

  if (!client) {
    return (
      <AuthScreen
        state="error"
        message="Authentication is not configured for this deployment."
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseShoppingApp
        userId={user.id}
        email={user.email}
        onSignOut={async () => {
          await client.auth.signOut();
          window.location.assign("/auth/login");
        }}
      />
    </QueryClientProvider>
  );
}

type SupabaseShoppingAppProps = {
  userId: string;
  email: string;
  onSignOut: () => Promise<unknown>;
};

function SupabaseShoppingApp({
  userId,
  email,
  onSignOut,
}: SupabaseShoppingAppProps) {
  const client = useMemo(() => getSupabaseBrowserClient()!, []);
  const queryClient = useQueryClient();
  const dataQuery = useQuery({
    queryKey: ["shopping-data", userId],
    queryFn: () => loadShoppingData(client, userId, email),
  });
  const cachedAvailabilityByUrl = useMemo(
    () =>
      Object.fromEntries(
        (dataQuery.data?.items ?? []).map((item) => [
          item.productUrl,
          item.availabilityStatus,
        ]),
      ),
    [dataQuery.data],
  );
  const staleProductUrls = useMemo(
    () =>
      [
        ...new Set(
          dataQuery.data?.items
            .filter(
              ({ productUrl, availabilityCheckedAt }) =>
                parseCheckersProductUrl(productUrl) &&
                isAvailabilityStale(availabilityCheckedAt),
            )
            .map(({ productUrl }) => productUrl) ?? [],
        ),
      ]
        .sort()
        .slice(0, 20),
    [dataQuery.data],
  );
  const availabilityQuery = useQuery({
    queryKey: ["product-availability", staleProductUrls],
    queryFn: () => loadProductAvailability(client, staleProductUrls),
    enabled: staleProductUrls.length > 0,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (!dataQuery.data) return;

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["shopping-data", userId] });
    const channel = client
      .channel(`mzansi-voter:${dataQuery.data.groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "item_comments" },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${dataQuery.data.groupId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, dataQuery.data, queryClient, userId]);

  if (dataQuery.isPending) {
    return <AuthScreen state="loading" message="Loading the Cape Town ballot…" />;
  }

  if (dataQuery.error || !dataQuery.data) {
    return (
      <AuthScreen
        state="error"
        message={
          dataQuery.error instanceof Error
            ? dataQuery.error.message
            : "The ballot could not be loaded."
        }
      />
    );
  }

  const data = dataQuery.data;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["shopping-data", userId] });
  const persistence: ShoppingPersistence = {
    saveItem: async (input, itemId) => {
      const existingItem = itemId
        ? data.items.find((item) => item.id === itemId)
        : undefined;
      const id = await saveItem(
        client,
        data.groupId,
        userId,
        input,
        itemId,
        existingItem,
      );
      await refresh();
      return id;
    },
    vote: async (itemId, value) => {
      await persistVote(client, itemId, userId, value);
      await refresh();
    },
    deleteItem: async (itemId) => {
      await deleteItem(client, itemId);
      await refresh();
    },
    setItemFlags: async (itemId, patch) => {
      await setItemFlags(client, itemId, patch);
      await refresh();
    },
    updateGroupSettings: async (settings) => {
      await updateGroupSettings(client, data.groupId, settings);
      await refresh();
    },
    clearItems: async () => {
      await clearItems(client, data.groupId);
      await refresh();
    },
    startNextCycle: async (acceptedItemIds) => {
      await startNextCycle(client, data.groupId, acceptedItemIds);
      await refresh();
    },
    addComment: async (itemId, body) => {
      await addItemComment(client, itemId, userId, body);
      await refresh();
    },
  };
  return (
    <MzansiVoterApp
      user={data.user}
      groupName={data.groupName}
      startingRetailer={data.retailer}
      startingItems={data.items}
      startingBudgetCents={data.budgetCents}
      startingNextOrderDate={data.nextOrderDate}
      startingCutoffTime={data.cutoffTime}
      startingCommentsByItemId={data.commentsByItemId}
      availabilityByUrl={{
        ...cachedAvailabilityByUrl,
        ...(availabilityQuery.data ?? {}),
      }}
      persistence={persistence}
      onSignOut={() => void onSignOut()}
    />
  );
}

export function AuthBoundary({ user }: { user: AuthenticatedUser }) {
  return <ConnectedApp user={user} />;
}
