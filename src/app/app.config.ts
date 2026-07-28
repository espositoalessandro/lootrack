import { provideTaiga } from "@taiga-ui/core";
import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter, withViewTransitions } from "@angular/router";

import { routes } from "./app.routes";
import { provideHttpClient } from "@angular/common/http";
import { TranslocoHttpLoader } from "./transloco-loader";
import { provideTransloco } from "@jsverse/transloco";
import { provideStore } from "@ngrx/store";
import { transactionsReducer } from "./state/transactions/transactions.reducer";
import { TransactionsEffects } from "./state/transactions/transactions.effects";
import { provideEffects } from "@ngrx/effects";
import { provideServiceWorker } from "@angular/service-worker";
import { categoriesReducer } from "./state/categories/categories.reducer";
import { CategoriesEffects } from "./state/categories/categories.effects";
import { provideStoreDevtools } from "@ngrx/store-devtools";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions()),
    provideTaiga({ mode: "light", apis: { liquidGlass: true } }),
    provideHttpClient(),
    provideStore({
      transactions: transactionsReducer,
      categories: categoriesReducer,
    }),
    ...(isDevMode()
      ? [
          provideStoreDevtools({
            name: "Lootrack",
            maxAge: 25,
            autoPause: true,
            trace: false,
          }),
        ]
      : []),
    provideEffects(TransactionsEffects, CategoriesEffects),
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
