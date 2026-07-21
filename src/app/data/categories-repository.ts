import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AddCategory, Category } from "./models";
import { lootrackDb } from "./database";

@Injectable({
  providedIn: "root",
})
export class CategoriesRepository {
  getActive(): Observable<Category[]> {
    return defer(() =>
      lootrackDb.categories
        .filter((category) => category.deletedAt === null)
        .toArray(),
    );
  }

  getAllIncludingDeleted(): Observable<Category[]> {
    return defer(() => lootrackDb.categories.toArray());
  }

  add(input: AddCategory): Observable<Category> {
    return defer(async () => {
      const category: Category = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await lootrackDb.categories.add(category);
      return category;
    });
  }

  remove(id: string): Observable<string> {
    return defer(async () => {
      const existing = await lootrackDb.categories.get(id);

      if (!existing) {
        throw new Error("Category not found");
      }

      const deletedCategory: Category = {
        ...existing,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.categories.put(deletedCategory);

      return deletedCategory.id;
    });
  }

  update(id: string, changes: AddCategory): Observable<Category> {
    return defer(async () => {
      const existing = await lootrackDb.categories.get(id);

      if (!existing) {
        throw new Error("Category not found");
      }

      const updatedCategory: Category = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.categories.put(updatedCategory);

      return updatedCategory;
    });
  }
}
