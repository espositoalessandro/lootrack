import { Injectable } from "@angular/core";
import { environment } from "../../../../environments/environment";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_EXPIRY_MARGIN_MS = 30_000;

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken(options?: {
    prompt?: "" | "consent" | "select_account";
  }): void;
}

interface GoogleOAuthError {
  type: "popup_failed_to_open" | "popup_closed" | "unknown";
}

interface GoogleIdentityWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient(config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
          error_callback?: (error: GoogleOAuthError) => void;
        }): GoogleTokenClient;
      };
    };
  };
}

@Injectable({
  providedIn: "root",
})
export class GoogleAuthorizationService {
  private loadingPromise: Promise<void> | null = null;
  private accessToken: string | null = null;
  private expiresAt = 0;

  loadLibrary(): Promise<void> {
    const googleWindow = window as GoogleIdentityWindow;

    if (googleWindow.google?.accounts?.oauth2) {
      return Promise.resolve();
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");

      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;

      script.addEventListener(
        "load",
        () => {
          if (googleWindow.google?.accounts?.oauth2) {
            resolve();
            return;
          }

          this.loadingPromise = null;

          reject(
            new Error(
              "Google Identity Services loaded without exposing its OAuth API",
            ),
          );
        },
        { once: true },
      );

      script.addEventListener(
        "error",
        () => {
          script.remove();
          this.loadingPromise = null;

          reject(new Error("Google Identity Services could not be loaded"));
        },
        { once: true },
      );

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  async getAccessToken(): Promise<string> {
    const cachedToken = this.getCachedAccessToken();

    if (cachedToken) {
      return cachedToken;
    }

    await this.loadLibrary();

    const googleWindow = window as GoogleIdentityWindow;
    const oauth2 = googleWindow.google?.accounts?.oauth2;

    if (!oauth2) {
      throw new Error("Google OAuth API is unavailable");
    }

    return new Promise<string>((resolve, reject) => {
      const tokenClient = oauth2.initTokenClient({
        client_id: environment.googleSheets.oauthClientId,
        scope: GOOGLE_DRIVE_FILE_SCOPE,

        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(
              new Error(
                response.error_description ??
                  response.error ??
                  "Google authorization failed",
              ),
            );

            return;
          }

          this.accessToken = response.access_token;

          this.expiresAt = Date.now() + (response.expires_in ?? 0) * 1_000;

          resolve(response.access_token);
        },

        error_callback: (error) => {
          reject(new Error(`Google authorization popup failed: ${error.type}`));
        },
      });

      tokenClient.requestAccessToken();
    });
  }

  private getCachedAccessToken(): string | null {
    const isStillValid =
      this.accessToken && Date.now() < this.expiresAt - TOKEN_EXPIRY_MARGIN_MS;

    return isStillValid ? this.accessToken : null;
  }

  clearAccessToken(): void {
    this.accessToken = null;
    this.expiresAt = 0;
  }
}
