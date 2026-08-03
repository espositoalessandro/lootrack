import { CurrencyPipe } from "@angular/common";
import {
  Component,
  computed,
  DestroyRef,
  effect,
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
  TuiLoader,
  TuiTextfield,
  TuiTitle,
} from "@taiga-ui/core";
import { TuiSheetDialog, TuiSheetDialogOptions } from "@taiga-ui/addon-mobile";
import {
  TuiAccordion,
  TuiAccordionComponent,
  TuiSegmented,
} from "@taiga-ui/kit";
import { TuiFloatingContainer } from "@taiga-ui/layout";
import { filter, startWith, take } from "rxjs";

import type {
  AddCategory,
  Category,
  TransactionType,
  UpdateCategory,
} from "../../data/models";
import { TranslocoPipe } from "@jsverse/transloco";
import { Store } from "@ngrx/store";
import { Actions, ofType } from "@ngrx/effects";
import {
  addCategory,
  addCategorySuccess,
  updateCategory,
  updateCategorySuccess,
} from "../../state/categories/categories.actions";
import {
  selectTransactions,
  selectTransactionsLoading,
  selectTransactionWithNoCategory,
} from "../../state/transactions/transactions.selector";
import {
  selectCategoryById,
  selectCategoryLoading,
} from "../../state/categories/categories.selector";

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
    TuiLoader,
    TuiAccordionComponent,
    TuiAccordion,
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
  protected readonly categoryId = this.route.snapshot.paramMap.get("id");
  protected readonly isEditMode = this.categoryId !== null;
  protected readonly titleKey = this.isEditMode
    ? "newCategory.titleEdit"
    : "newCategory.title";
  protected readonly submitLabelKey = this.isEditMode
    ? "newCategory.save"
    : "newCategory.create";
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

  private readonly transactionsWithoutCategories = this.store.selectSignal(
    selectTransactionWithNoCategory(),
  );
  private readonly transactions = this.store.selectSignal(selectTransactions);

  protected readonly categoryHasTransactions = computed(() => {
    if (!this.categoryId) {
      return false;
    }

    return this.transactions().some(
      (transaction) => transaction.categoryId === this.categoryId,
    );
  });
  protected readonly filteredTransactions = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.availableTransactions().filter(
      (transaction) =>
        !query ||
        transaction.description.toLocaleLowerCase().includes(query) ||
        transaction.occurredOn.includes(query),
    );
  });

  protected readonly selectedTotalInCents = computed(() => {
    const selectedIds = new Set(this.selectedTransactionIds());
    return this.availableTransactions()
      .filter((transaction) => selectedIds.has(transaction.id))
      .reduce((total, transaction) => total + transaction.amountInCents, 0);
  });

  private readonly availableTransactions = computed(() => {
    const type = this.selectedType();
    return this.transactionsWithoutCategories().filter(
      (transaction) => transaction.type === type,
    );
  });

  protected readonly transactionsLoading = this.store.selectSignal(
    selectTransactionsLoading,
  );
  protected readonly categoriesLoading = this.store.selectSignal(
    selectCategoryLoading,
  );

  private readonly categoryTypeDisabledEffect = effect(() => {
    if (!this.isEditMode) {
      return;
    }

    const typeControl = this.form.controls.type;

    const shouldDisable =
      this.transactionsLoading() || this.categoryHasTransactions();

    if (shouldDisable && typeControl.enabled) {
      typeControl.disable({
        emitEvent: false,
      });
    }

    if (!shouldDisable && typeControl.disabled) {
      typeControl.enable({
        emitEvent: false,
      });
    }
  });

  private readonly searchDisabledEffect = effect(() => {
    const searchControl = this.form.controls.search;
    const hasTransactions = this.availableTransactions().length > 0;

    if (hasTransactions && searchControl.disabled) {
      searchControl.enable({ emitEvent: false });
    }

    if (!hasTransactions && searchControl.enabled) {
      searchControl.disable({ emitEvent: false });
    }
  });

  ngOnInit(): void {
    this.actions$
      .pipe(
        ofType(addCategorySuccess, updateCategorySuccess),
        filter((action) =>
          this.isEditMode
            ? action.type === updateCategorySuccess.type
            : action.type === addCategorySuccess.type,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.close();
      });

    if (!this.categoryId) {
      return;
    }

    this.store
      .select(selectCategoryById(this.categoryId))
      .pipe(
        filter((category): category is Category => category !== undefined),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((category) => {
        this.form.controls.name.setValue(category.name);
        this.form.controls.type.setValue(category.type);
      });
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
    // getRawValue includes the disabled type control in edit mode.
    const formValue = this.form.getRawValue();
    const transactionIds = this.selectedTransactionIds();

    if (this.categoryId) {
      const changes: UpdateCategory = {
        name: formValue.name,
        type: formValue.type,
        transactionIds,
      };
      this.store.dispatch(
        updateCategory({
          id: this.categoryId,
          changes,
        }),
      );
      return;
    }

    const newCategory: AddCategory = {
      name: formValue.name,
      type: formValue.type,
      transactionIds,
    };

    this.store.dispatch(
      addCategory({
        category: newCategory,
      }),
    );
  }
}
