import { CurrencyPipe } from "@angular/common";
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
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
import { startWith, take } from "rxjs";

import type {
  AddCategory,
  Transaction,
  TransactionType,
} from "../../data/models";
import { TranslocoPipe } from "@jsverse/transloco";
import { AmountPipe } from "../../shared/pipes/amount-pipe";
import { Store } from "@ngrx/store";
import { Actions, ofType } from "@ngrx/effects";
import {
  addCategory,
  addCategorySuccess,
  updateCategorySuccess,
} from "../../state/categories/categories.actions";
import { selectTransactionWithNoCategory } from "../../state/transactions/transactions.selector";

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
export class NewCategory implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actions$ = inject(Actions);

  protected readonly transactionsExpanded = signal(false);
  private transactions: Transaction[] = [];
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

  protected readonly filteredTransactions = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const type = this.selectedType();
    return this.transactions.filter(
      (transaction) =>
        transaction.type === type &&
        (!query ||
          transaction.description.toLocaleLowerCase().includes(query) ||
          transaction.occurredOn.includes(query)),
    );
  });

  protected readonly transactionsWithoutCategories = this.store.select(
    selectTransactionWithNoCategory(),
  );

  protected readonly selectedTotalInCents = computed(() => {
    const selectedIds = new Set(this.selectedTransactionIds());
    return this.transactions
      .filter((transaction) => selectedIds.has(transaction.id))
      .reduce((total, transaction) => total + transaction.amountInCents, 0);
  });

  ngOnInit() {
    this.actions$
      .pipe(
        ofType(addCategorySuccess, updateCategorySuccess),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.close();
      });

    this.transactionsWithoutCategories
      .pipe(take(1))
      .subscribe((transactions) => (this.transactions = transactions));
  }

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

    const newCategory: AddCategory = {
      name: this.form.value.name!,
      type: this.form.value.type!,
      transactionIds: this.selectedTransactionIds(),
    };

    this.store.dispatch(addCategory({ category: newCategory }));

    this.close();
  }
}
