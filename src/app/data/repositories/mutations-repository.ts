import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { Mutation } from "../models";
import { lootrackDb } from "../database";

@Injectable({
  providedIn: "root",
})
export class MutationsRepository {
  getAll(): Observable<Mutation[] | null> {
    return defer(async () => {
      const mutations = await lootrackDb.mutations.toArray();
      if (!mutations) {
        return null;
      }
      return mutations;
    });
  }
}
