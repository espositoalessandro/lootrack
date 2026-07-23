import { CurrencyPipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { TuiAnimated } from "@taiga-ui/cdk";
import {
  TuiButton,
  TuiIcon,
  TuiInput,
  TuiTextfield,
  TuiTitle,
} from "@taiga-ui/core";
import { TuiSheetDialog, TuiSheetDialogOptions } from "@taiga-ui/addon-mobile";
import { TuiSegmented } from "@taiga-ui/kit";
import { TuiFloatingContainer } from "@taiga-ui/layout";
import { startWith } from "rxjs";

import type { TransactionType } from "../../data/models";
import { TranslocoPipe } from "@jsverse/transloco";
import { AmountPipe } from "../../shared/pipes/amount-pipe";

interface MockUncategorizedTransaction {
  id: string;
  type: TransactionType;
  amountInCents: number;
  description: string;
  occurredOn: string;
}

@Component({
  selector: "app-new-category",
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    TuiAnimated,
    TuiButton,
    TuiFloatingContainer,
    TuiIcon,
    TuiInput,
    TuiSegmented,
    TuiSheetDialog,
    TuiTextfield,
    TuiTitle,
    TranslocoPipe,
    AmountPipe,
  ],
  templateUrl: "./new-category.html",
  styleUrl: "./new-category.scss",
})
export class NewCategory {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly transactionsExpanded = signal(false);
  private readonly initialType: TransactionType =
    this.route.snapshot.queryParamMap.get("type") === "income"
      ? "income"
      : "expense";
  protected open = true;

  protected readonly options: Partial<TuiSheetDialogOptions> = {
    closable: true,
  };

  protected readonly form = new FormGroup({
    name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),

    type: new FormControl<TransactionType>(this.initialType, {
      nonNullable: true,
    }),

    search: new FormControl("", {
      nonNullable: true,
    }),
  });

  private readonly selectedType = toSignal(
    this.form.controls.type.valueChanges.pipe(
      startWith(this.form.controls.type.value),
    ),
    {
      initialValue: this.form.controls.type.value,
    },
  );

  private readonly search = toSignal(
    this.form.controls.search.valueChanges.pipe(
      startWith(this.form.controls.search.value),
    ),
    {
      initialValue: this.form.controls.search.value,
    },
  );

  protected readonly selectedTransactionIds = signal<string[]>([]);

  private readonly mockTransactions: readonly MockUncategorizedTransaction[] = [
    {
      id: "expense-supermarket",
      type: "expense",
      amountInCents: 3420,
      description: "Supermarket",
      occurredOn: "2026-07-22",
    },
    {
      id: "expense-takeaway",
      type: "expense",
      amountInCents: 1800,
      description: "Takeaway",
      occurredOn: "2026-07-20",
    },
    {
      id: "expense-grocery-store",
      type: "expense",
      amountInCents: 5135,
      description: "Grocery store",
      occurredOn: "2026-07-18",
    },
    {
      id: "expense-coffee-shop",
      type: "expense",
      amountInCents: 450,
      description: "Coffee shop",
      occurredOn: "2026-07-15",
    },
    {
      id: "income-refund",
      type: "income",
      amountInCents: 2499,
      description: "Store refund",
      occurredOn: "2026-07-21",
    },
    {
      id: "income-freelance",
      type: "income",
      amountInCents: 15000,
      description: "Freelance payment",
      occurredOn: "2026-07-17",
    },
  ];

  protected readonly filteredTransactions = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const type = this.selectedType();

    return this.mockTransactions.filter(
      (transaction) =>
        transaction.type === type &&
        (!query ||
          transaction.description.toLocaleLowerCase().includes(query) ||
          transaction.occurredOn.includes(query)),
    );
  });

  protected readonly selectedTotalInCents = computed(() => {
    const selectedIds = new Set(this.selectedTransactionIds());

    return this.mockTransactions
      .filter((transaction) => selectedIds.has(transaction.id))
      .reduce((total, transaction) => total + transaction.amountInCents, 0);
  });

  protected isSelected(id: string): boolean {
    return this.selectedTransactionIds().includes(id);
  }

  protected toggleTransaction(id: string): void {
    this.selectedTransactionIds.update((selectedIds) =>
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  }

  protected onTypeChange(): void {
    this.form.controls.search.setValue("");
    this.selectedTransactionIds.set([]);
  }

  protected close(): void {
    void this.router.navigate([
      {
        outlets: {
          sheet: null,
        },
      },
    ]);
  }

  protected openTransactionList(): void {
    this.transactionsExpanded.set(true);
  }

  protected toggleTransactionList(): void {
    this.transactionsExpanded.update((expanded) => !expanded);
  }

  protected deselectAll(): void {
    this.selectedTransactionIds.set([]);
  }

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.close();
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.debug("New category UI payload", {
      name: this.form.controls.name.value,
      type: this.form.controls.type.value,
      transactionIds: this.selectedTransactionIds(),
    });

    this.close();
  }
}
