import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AppSettings, AppSettingsPatch } from "../models";
import { lootrackDb } from "../database";
import { AppSettingsNotFoundError } from "../errors";

@Injectable({
  providedIn: "root",
})
export class AppSettingsRepository {
  get(): Observable<AppSettings> {
    return defer(async () => {
      const settings = await lootrackDb.appSettings.get("app");
      if (!settings) {
        throw new AppSettingsNotFoundError();
      }
      return settings;
    });
  }

  update(newSettings: AppSettingsPatch): Observable<AppSettings> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.appSettings,
        lootrackDb.mutations,
        async () => {
          const updated = await lootrackDb.appSettings.update(
            "app",
            newSettings,
          );

          if (!updated) {
            throw new AppSettingsNotFoundError();
          }

          const settings = await lootrackDb.appSettings.get("app");

          if (!settings) {
            throw new AppSettingsNotFoundError();
          }
          await lootrackDb.mutations.add({
            mutationId: crypto.randomUUID(),
            entityType: "settings",
            entityId: "app",
            operation: "upsert",
            payloadJson: JSON.stringify(settings),
            createdAt: new Date().toISOString(),
          });

          return settings;
        },
      ),
    );
  }

  add(settings: AppSettings): Observable<AppSettings> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.appSettings,
        lootrackDb.mutations,
        async () => {
          const currentSettings = await lootrackDb.appSettings.toArray();
          if (currentSettings && currentSettings.length > 0) {
            throw new Error("App settings already exist");
          }
          await lootrackDb.appSettings.add({ ...settings });
          const addedSettings = await lootrackDb.appSettings.toArray();
          if (addedSettings && addedSettings.length === 1) {
            await lootrackDb.mutations.add({
              mutationId: crypto.randomUUID(),
              entityType: "settings",
              entityId: "app",
              operation: "upsert",
              payloadJson: JSON.stringify(addedSettings[0]),
              createdAt: new Date().toISOString(),
            });
            return addedSettings[0];
          } else {
            throw new Error("Failed to add app settings");
          }
        },
      ),
    );
  }
}
