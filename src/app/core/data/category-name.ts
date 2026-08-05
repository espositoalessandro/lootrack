import { TransactionType } from "./models";

interface CategoryIdentity {
  name: string;
  type: TransactionType;
}

export function cleanCategoryName(name: string): string {
  return name.trim();
}

export function categoryNamesMatch(a: string, b: string): boolean {
  return (
    cleanCategoryName(a).toLowerCase() === cleanCategoryName(b).toLowerCase()
  );
}

export function categoryKey(category: CategoryIdentity): string {
  return `${category.type}:${cleanCategoryName(category.name).toLowerCase()}`;
}
