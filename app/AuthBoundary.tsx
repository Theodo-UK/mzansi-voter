"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { MzansiVoterApp, type ShoppingPersistence } from "./MzansiVoterApp";
import { AuthScreen } from "./components/AuthScreen";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  deleteItem,
  loadShoppingData,
  persistVote,
  saveItem,
  setItemFlags,
  startNextCycle,
  updateGroupSettings,
} from "@/lib/supabase/repository";
import { isAllowedTheodoEmail } from "@/lib/voting";

function ConnectedApp() {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const queryClient = useMemo(() => new QueryClient(), []);
  const [session, setSession] = useState<Session | null | undefined>();
  const [authError, setAuthError] = useState("");
  const sessionEmail = session?.user.email ?? "";
  const sessionAllowed =
    session === null || session === undefined
      ? true
      : session.user.app_metadata.provider === "google" &&
        isAllowedTheodoEmail(sessionEmail);

  useEffect(() => {
    if (!client) return;

    void client.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message);
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError("");
    });

    return () => subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (client && session && !sessionAllowed) {
      void client.auth.signOut();
    }
  }, [client, session, sessionAllowed]);

  if (!client) return <MzansiVoterApp />;

  if (authError) {
    return <AuthScreen state="error" message={authError} />;
  }

  if (session === undefined) {
    return <AuthScreen state="loading" />;
  }

  if (!session) {
    return (
      <AuthScreen
        state="signed_out"
        onSignIn={() => {
          void client.auth
            .signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: window.location.origin,
                queryParams: {
                  hd: "theodo.com",
                },
              },
            })
            .then(({ error }) => {
              if (error) setAuthError(error.message);
            });
        }}
      />
    );
  }

  if (!sessionAllowed) {
    return (
      <AuthScreen
        state="denied"
        message="Use a verified @theodo.com Google account to enter Mzansi Voter."
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseShoppingApp
        userId={session.user.id}
        email={sessionEmail}
        onSignOut={() => client.auth.signOut()}
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

export function AuthBoundary() {
  if (!isSupabaseConfigured()) {
    return <MzansiVoterApp />;
  }

  return <ConnectedApp />;
}
