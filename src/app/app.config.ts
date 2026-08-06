import { provideTaiga } from "@taiga-ui/core";
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { provideHttpClient } from "@angular/common/http";
import { TranslocoHttpLoader } from "./transloco-loader";
import { provideTransloco } from "@jsverse/transloco";
import { provideStore } from "@ngrx/store";
import { transactionsReducer } from "./state/transactions/transactions.reducer";
import { TransactionsEffects } from "./state/transactions/transactions.effects";
import { Actions, ofType, provideEffects } from "@ngrx/effects";
import { provideServiceWorker } from "@angular/service-worker";
import { categoriesReducer } from "./state/categories/categories.reducer";
import { CategoriesEffects } from "./state/categories/categories.effects";
import { provideStoreDevtools } from "@ngrx/store-devtools";
import { appSettingsReducer } from "./state/app-settings/app-settings.reducer";
import { AppSettingsEffects } from "./state/app-settings/app-settings.effects";
import { SYNC_PROVIDER } from "./core/data/CONST";
import { syncReducer } from "./state/sync/sync.reducer";
import { GoogleSheetsProvider } from "./core/sync/google/google-sheets.provider";
import { SyncEffects } from "./state/sync/sync.effects";
import { TUI_PULL_TO_REFRESH_LOADED } from "@taiga-ui/addon-mobile";
import {
  synchronizeConnectionRequired,
  synchronizeFailure,
  synchronizeSuccess,
} from "./state/sync/sync.actions";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTaiga({ apis: { liquidGlass: true } }),
    provideHttpClient(),
    provideStore({
      transactions: transactionsReducer,
      categories: categoriesReducer,
      appSettings: appSettingsReducer,
      sync: syncReducer,
    }),
    provideEffects(
      TransactionsEffects,
      CategoriesEffects,
      AppSettingsEffects,
      SyncEffects,
    ),
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
    provideTransloco({
      config: {
        availableLangs: ["en"],
        defaultLang: "en",
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
    {
      provide: SYNC_PROVIDER,
      useClass: GoogleSheetsProvider,
    },
    provideEnvironmentInitializer(() => {
      const syncProvider = inject(SYNC_PROVIDER);
      void syncProvider.initialize().catch(() => {
        // Sync is optional. Failure must not prevent the local app from starting.
      });
    }),
    {
      provide: TUI_PULL_TO_REFRESH_LOADED,
      useFactory: (actions$: Actions) =>
        actions$.pipe(
          ofType(
            synchronizeSuccess,
            synchronizeFailure,
            synchronizeConnectionRequired,
          ),
        ),
      deps: [Actions],
    },
  ],
};
