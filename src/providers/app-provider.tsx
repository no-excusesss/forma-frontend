"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError, optional } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";
import type {
  AuthUser,
  OwnProfile,
  OwnSeller,
  SessionResponse,
} from "@/lib/contracts";
const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  error: null,
  retry: () => {},
  logout: async () => {},
});
const FeedbackContext = createContext<(message: string) => void>(() => {});
function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const notify = useContext(FeedbackContext);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: ({ signal }) =>
      api<SessionResponse>("/api/auth/get-session", { signal }),
    retry: false,
    staleTime: 60_000,
  });
  const accountId = session.data?.user.id;
  useQuery({
    queryKey: ["private", accountId, "profile"],
    queryFn: ({ signal }) => optional<OwnProfile>("/users/me/profile", signal),
    enabled: !!accountId,
  });
  useQuery({
    queryKey: ["private", accountId, "seller"],
    queryFn: ({ signal }) => optional<OwnSeller>("/sellers/me", signal),
    enabled: !!accountId,
  });
  async function logout() {
    await api("/api/auth/sign-out", { method: "POST", body: {} });
    await client.cancelQueries();
    client.setQueryData(["session"], null);
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "session",
    });
    client.getMutationCache().clear();
    notify("You’re signed out.");
  }
  return (
    <AuthContext.Provider
      value={{
        user: session.data?.user ?? null,
        loading: session.isPending,
        error: session.error,
        retry: () => {
          void session.refetch();
        },
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState("");
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              !(
                error instanceof ApiError &&
                [400, 401, 403, 404, 409].includes(error.status)
              ) && count < 1,
            staleTime: 30_000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <FeedbackContext.Provider value={setFeedback}>
        <AuthProvider>{children}</AuthProvider>
        {feedback && (
          <div className="toast" role="status">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{feedback}</span>
            <button
              className="icon-button"
              onClick={() => setFeedback("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}
      </FeedbackContext.Provider>
    </QueryClientProvider>
  );
}
export const useAuth = () => useContext(AuthContext);
export const useFeedback = () => useContext(FeedbackContext);
export function useOwnProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["private", user?.id, "profile"],
    queryFn: ({ signal }) => optional<OwnProfile>("/users/me/profile", signal),
    enabled: !!user,
  });
}
export function useOwnSeller() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["private", user?.id, "seller"],
    queryFn: ({ signal }) => optional<OwnSeller>("/sellers/me", signal),
    enabled: !!user,
  });
}
export function useRefresh() {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries();
  };
}
