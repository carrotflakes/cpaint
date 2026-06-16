/**
 * Google sign-in for Drive access, using Google Identity Services (GIS) loaded
 * from a script tag — no npm dependency. We request the `drive.file` scope,
 * which only grants access to files this app creates, so it stays a
 * non-sensitive OAuth scope.
 *
 * Set `VITE_GOOGLE_CLIENT_ID` (a Web OAuth client id) to enable this.
 */

import { create } from "zustand";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const TOKEN_LEEWAY_MS = 60_000;

export const isGoogleConfigured = !!CLIENT_ID;

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type TokenClient = {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string }) => void;
          }): TokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

type AuthState = {
  signedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
};

let accessToken: string | null = null;
let tokenExpiry = 0;
let tokenClient: TokenClient | null = null;
let waiters: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

let gisLoad: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisLoad) return gisLoad;
  gisLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
  return gisLoad;
}

async function ensureTokenClient(): Promise<TokenClient> {
  if (tokenClient) return tokenClient;
  if (!CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID is not set");
  await loadGis();
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.access_token) {
        accessToken = response.access_token;
        tokenExpiry =
          Date.now() + (response.expires_in ?? 3600) * 1000 - TOKEN_LEEWAY_MS;
        useGoogleAuth.setState({ signedIn: true });
        settle((w) => w.resolve(response.access_token!));
      } else {
        settle((w) => w.reject(new Error(response.error ?? "Authorization failed")));
      }
    },
    error_callback: (error) =>
      settle((w) => w.reject(new Error(error.type ?? "Authorization error"))),
  });
  return tokenClient;
}

function settle(apply: (waiter: (typeof waiters)[number]) => void) {
  const pending = waiters;
  waiters = [];
  pending.forEach(apply);
}

function requestToken(prompt: "" | "consent"): Promise<string> {
  return new Promise((resolve, reject) => {
    waiters.push({ resolve, reject });
    tokenClient!.requestAccessToken({ prompt });
  });
}

/** A valid access token, refreshing silently when the cached one is stale. */
export async function getAccessToken(): Promise<string> {
  await ensureTokenClient();
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  return requestToken("");
}

export const useGoogleAuth = create<AuthState>(() => ({
  signedIn: false,
  async signIn() {
    await ensureTokenClient();
    await requestToken("consent");
  },
  signOut() {
    if (accessToken) window.google?.accounts.oauth2.revoke(accessToken);
    accessToken = null;
    tokenExpiry = 0;
    useGoogleAuth.setState({ signedIn: false });
  },
}));
