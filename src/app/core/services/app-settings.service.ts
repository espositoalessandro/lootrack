import { inject, Service } from "@angular/core";
import { map, Observable, switchMap } from "rxjs";

import { AppSettings, AppSettingsPatch } from "../models/models";
import { AppSettingsNotFoundError } from "../models/errors";
import {
  PERSISTENCE_PROVIDER,
  PersistenceContext,
} from "../persistence/providers/provider.models";

@Service()
export class AppSettingsService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);

  get(): Observable<AppSettings> {
    return this.getFrom(this.persistenceProvider);
  }

  add(settings: AppSettings): Observable<AppSettings> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["appSettings"],
      (db) =>
        db.appSettings.get("app").pipe(
          switchMap((existing) => {
            if (existing) {
              throw new Error("App settings already exist");
            }

            return db.appSettings.add(settings).pipe(map(() => settings));
          }),
        ),
    );
  }

  update(patch: AppSettingsPatch): Observable<AppSettings> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["appSettings"],
      (db) =>
        this.getFrom(db).pipe(
          switchMap((settings) => {
            const updated: AppSettings = {
              ...settings,
              ...patch,
            };

            return db.appSettings.put(updated).pipe(map(() => updated));
          }),
        ),
    );
  }

  private getFrom(db: PersistenceContext): Observable<AppSettings> {
    return db.appSettings.get("app").pipe(
      map((settings) => {
        if (!settings) {
          throw new AppSettingsNotFoundError();
        }

        return settings;
      }),
    );
  }
}
