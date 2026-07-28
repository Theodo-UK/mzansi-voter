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
import {
  deleteItem,
  loadShoppingData,
  persistVote,
  saveItem,
  setItemFlags,
  startNextCycle,
  updateGroupSettings,
} from "@/lib/supabase/repository";

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
      const id = await saveItem(client, data.groupId, userId, input, itemId);
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
    startNextCycle: async (acceptedItemIds) => {
      await startNextCycle(client, data.groupId, acceptedItemIds);
      await refresh();
    },
  };
  const dataVersion = JSON.stringify([
    data.retailer,
    data.budgetCents,
    data.nextOrderDate,
    data.cutoffTime,
    data.items,
    data.user.role,
  ]);

  return (
    <MzansiVoterApp
      key={dataVersion}
      user={data.user}
      groupName={data.groupName}
      startingRetailer={data.retailer}
      startingItems={data.items}
      startingBudgetCents={data.budgetCents}
      startingNextOrderDate={data.nextOrderDate}
      startingCutoffTime={data.cutoffTime}
      persistence={persistence}
      onSignOut={() => void onSignOut()}
    />
  );
}

type AuthBoundaryProps =
  | { user: AuthenticatedUser }
  | { fixture: true };

export function AuthBoundary(props: AuthBoundaryProps) {
  return "fixture" in props ? (
    <MzansiVoterApp />
  ) : (
    <ConnectedApp user={props.user} />
  );
}
