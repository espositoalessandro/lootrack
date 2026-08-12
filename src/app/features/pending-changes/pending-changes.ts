import { Component, computed, inject } from "@angular/core";
import { Store } from "@ngrx/store";

import {
  selectPendingChanges,
  selectPendingMutationCount,
} from "../../state/sync/sync.selector";
import { TuiAppearance } from "@taiga-ui/core";
import { DatePipe } from "@angular/common";
import {
  EntityFieldChange,
  PendingEntityChanges,
  Transaction,
} from "../../core/models/models";
import { selectCategory } from "../../state/categories/categories.selector";

interface PendingFieldView {
  label: string;
  before: string;
  after: string;
}

interface PendingChangeView {
  kind: "created" | "updated" | "deleted";
  createdAt: string;
  fields: PendingFieldView[];
}

interface PendingItemView {
  entityType: "transaction" | "category";
  entityId: string;
  title: string;
  subtitle: string;
  amountInCents?: number;
  transactionType?: "income" | "expense";
  changes: PendingChangeView[];
}

@Component({
  selector: "app-pending-changes",
  imports: [TuiAppearance, DatePipe],
  templateUrl: "./pending-changes.html",
  styleUrl: "./pending-changes.scss",
})
export class PendingChanges {
  private readonly store = inject(Store);

  protected readonly pendingChanges =
    this.store.selectSignal(selectPendingChanges);

  protected readonly mutationCount = this.store.selectSignal(
    selectPendingMutationCount,
  );
  protected readonly categories = this.store.selectSignal(selectCategory);

  protected readonly items = computed(() =>
    this.pendingChanges().map((item) => this.toViewModel(item)),
  );

  private transactionTitle(transaction: Transaction): string {
    return transaction.description.trim() || "Transaction";
  }

  private formatTransactionField(
    field: EntityFieldChange,
  ): PendingFieldView | null {
    switch (field.field) {
      case "amountInCents":
        return {
          label: "Amount",
          before: String(field.before),
          after: String(field.after),
        };

      case "description":
        return {
          label: "Description",
          before: String(field.before || "None"),
          after: String(field.after || "None"),
        };

      case "occurredOn":
        return {
          label: "Date",
          before: String(field.before),
          after: String(field.after),
        };

      case "categoryId":
        return {
          label: "Category",
          before: this.categoryName(field.before as string | null),
          after: this.categoryName(field.after as string | null),
        };

      case "type":
        return {
          label: "Type",
          before: String(field.before),
          after: String(field.after),
        };

      default:
        return null;
    }
  }

  private categoryName(id: string | null): string {
    if (id === null) {
      return "Uncategorized";
    }

    return (
      this.categories().find((category) => category.id === id)?.name ??
      "Unknown category"
    );
  }

  private toViewModel(pending: PendingEntityChanges) {
    return {
      changes: pending.changes.map((change) => ({
        kind: change.kind,
        createdAt: change.createdAt,
        fields: change.fields.map(
          (field) =>
            this.formatTransactionField(field) ?? {
              label: "Unknown field",
              before: String(field.before),
              after: String(field.after),
            },
        ),
      })),
      title: this.transactionTitle(pending.entity as Transaction),
      entityId: pending.entityId,
      entityType: pending.entityType,
    } as PendingItemView;
  }
}
