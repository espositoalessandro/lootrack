import { provideTaiga } from "@taiga-ui/core";
import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { provideHttpClient } from "@angular/common/http";
import { TranslocoHttpLoader } from "./transloco-loader";
import { provideTransloco } from "@jsverse/transloco";
import { provideStore } from "@ngrx/store";
import { transactionsReducer } from "./state/transactions/transactions.reducer";
import { TransactionsEffects } from "./state/transactions/transactions.effects";
import { provideEffects } from "@ngrx/effects";
import { provideServiceWorker } from "@angular/service-worker";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTaiga(),
    provideHttpClient(),
    provideStore({
      transactions: transactionsReducer,
    }),
    provideEffects(TransactionsEffects),
    provideTransloco({
      config: {
        availableLangs: ["en"],
        defaultLang: "en",
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
