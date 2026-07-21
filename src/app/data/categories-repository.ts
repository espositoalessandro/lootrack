import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AddCategory, Category } from "./models";
import { lootrackDb } from "./database";

function normalizeCategoryName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

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
      const normalizedName = normalizeCategoryName(input.name);

      const categories = await lootrackDb.categories.toArray();

      const existing = categories.find(
        (category) =>
          category.type === input.type &&
          normalizeCategoryName(category.name) === normalizedName,
      );

      if (existing && existing.deletedAt === null) {
        throw new Error(
          `An ${input.type} category named "${input.name.trim()}" already exists`,
        );
      }

      if (existing && existing.deletedAt !== null) {
        throw new Error(
          `A deleted ${input.type} category named "${input.name.trim()}" already exists`,
        );
      }

      const now = new Date().toISOString();

      const category: Category = {
        id: crypto.randomUUID(),
        name: input.name.trim().replace(/\s+/g, " "),
        type: input.type,
        createdAt: now,
        updatedAt: now,
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

  updateName(id: string, name: string): Observable<Category> {
    return defer(async () => {
      const existing = await lootrackDb.categories.get(id);

      if (!existing || existing.deletedAt !== null) {
        throw new Error("Category not found");
      }

      const normalizedName = normalizeCategoryName(name);

      const duplicate = await lootrackDb.categories
        .filter(
          (category) =>
            category.id !== id &&
            category.type === existing.type &&
            category.deletedAt === null &&
            normalizeCategoryName(category.name) === normalizedName,
        )
        .first();

      if (duplicate) {
        throw new Error(
          `An ${existing.type} category named "${name.trim()}" already exists`,
        );
      }

      const updatedCategory: Category = {
        ...existing,
        name: name.trim().replace(/\s+/g, " "),
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.categories.put(updatedCategory);

      return updatedCategory;
    });
  }
}
