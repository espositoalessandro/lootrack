import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";

import { lootrackDb } from "../database";
import { SyncTarget } from "../models";

@Injectable({
  providedIn: "root",
})
export class SyncTargetRepository {
  get(): Observable<SyncTarget | null> {
    return defer(async () => {
      return (await lootrackDb.syncTargets.get("active")) ?? null;
    });
  }

  save(remoteId: string): Observable<SyncTarget> {
    return defer(async () => {
      const target: SyncTarget = {
        id: "active",
        remoteId,
      };

      await lootrackDb.syncTargets.put(target);

      return target;
    });
  }

  clear(): Observable<void> {
    return defer(async () => {
      await lootrackDb.syncTargets.delete("active");
    });
  }
}
