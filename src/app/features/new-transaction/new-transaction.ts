import { Component, DestroyRef, inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TuiButton, TuiInput, TuiTextfield, TuiTitle } from "@taiga-ui/core";
import {
  TuiDropdownSheet,
  TuiSheetDialog,
  TuiSheetDialogOptions,
} from "@taiga-ui/addon-mobile";
import { TuiFloatingContainer } from "@taiga-ui/layout";
import { TranslocoPipe } from "@jsverse/transloco";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { TuiAnimated, TuiDay, TuiPlatform } from "@taiga-ui/cdk";
import {
  TuiChevron,
  TuiDataListWrapperComponent,
  TuiInputDate,
  TuiInputDateTime,
  TuiSegmented,
  TuiSelect,
  TuiStringifyContentPipe,
  TuiStringifyPipe,
} from "@taiga-ui/kit";
import { Store } from "@ngrx/store";
import {
  addTransaction,
  addTransactionSuccess,
  updateTransaction,
  updateTransactionSuccess,
} from "../../state/transactions/transactions.actions";
import {
  AddTransaction,
  Category,
  CategoryAssignment,
  Transaction,
  TransactionType,
} from "../../core/models/models";
import { MaskitoDirective } from "@maskito/angular";
import { type MaskitoOptions } from "@maskito/core";
import { selectTransactionById } from "../../state/transactions/transactions.selector";
import {
  defer,
  distinctUntilChanged,
  filter,
  map,
  of,
  startWith,
  switchMap,
  take,
} from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Actions, ofType } from "@ngrx/effects";
import { AsyncPipe } from "@angular/common";
import {
  selectCategoriesByType,
  selectCategoryById,
} from "../../state/categories/categories.selector";

@Component({
  selector: "app-new-transactions",
  imports: [
    TuiButton,
    TuiSheetDialog,
    TuiFloatingContainer,
    TranslocoPipe,
    ReactiveFormsModule,
    TuiTextfield,
    TuiAnimated,
    TuiInput,
    TuiInputDateTime,
    TuiInputDate,
    TuiDropdownSheet,
    TuiSegmented,
    MaskitoDirective,
    TuiTitle,
    TuiDataListWrapperComponent,
    TuiChevron,
    TuiSelect,
    AsyncPipe,
    TuiStringifyPipe,
    TuiStringifyContentPipe,
    TuiPlatform,
  ],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actions$ = inject(Actions);

  protected readonly transactionId = this.route.snapshot.paramMap.get("id");
  protected readonly isEditMode = this.transactionId !== null;

  protected readonly amountMask: MaskitoOptions = {
    mask: /^\d*(?:[.,]\d{0,2})?$/,
  };
  protected readonly form = new FormGroup({
    amount: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/),
      ],
    }),
    category: new FormControl<Category | null>(null),
    occurred: new FormControl<TuiDay>(TuiDay.currentLocal(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    description: new FormControl("", {
      nonNullable: true,
    }),
    type: new FormControl<TransactionType>("expense", {
      nonNullable: true,
    }),
  });
  protected open = true;
  protected readonly options: Partial<TuiSheetDialogOptions> = {
    closable: true,
  };

  protected readonly categories$ = defer(() =>
    this.form.controls.type.valueChanges.pipe(
      startWith(this.form.controls.type.value),
      distinctUntilChanged(),
      switchMap((type) => this.store.select(selectCategoriesByType(type))),
    ),
  );

  ngOnInit(): void {
    // close on transaction creation/edit
    this.actions$
      .pipe(
        ofType(addTransactionSuccess, updateTransactionSuccess),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.close();
      });

    // refresh category on type change
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        const category = this.form.controls.category.value;

        if (category && category.type !== type) {
          this.form.controls.category.reset();
        }
      });

    // prefill category in edit mode
    if (this.isEditMode) {
      this.store
        .select(selectTransactionById(this.transactionId!))
        .pipe(
          filter(
            (transaction): transaction is Transaction =>
              transaction !== undefined,
          ),
          take(1),
          switchMap((transaction) => {
            if (!transaction.categoryId) {
              return of({
                transaction,
                category: null,
              });
            }
            return this.store
              .select(selectCategoryById(transaction.categoryId))
              .pipe(
                filter(
                  (category): category is Category => category !== undefined,
                ),
                take(1),
                map((category) => ({
                  transaction,
                  category,
                })),
              );
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(({ transaction, category }) => {
          this.prefillForm(transaction, category);
        });
    }
  }

  private prefillForm(
    transaction: Transaction,
    category: Category | null,
  ): void {
    const [year, month, day] = transaction.occurredOn.split("-").map(Number);

    this.form.setValue({
      amount: (transaction.amountInCents / 100).toFixed(2),
      occurred: new TuiDay(year, month - 1, day),
      category: category,
      description: transaction.description,
      type: transaction.type,
    });
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

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.close();
    }
  }

  protected onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const rawAmount = this.form.controls.amount.value.trim();
    const normalizedAmount = rawAmount.replace(",", ".");
    const amount = Number(normalizedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      this.form.controls.amount.setErrors({ invalidAmount: true });
      return;
    }
    const occurred = this.form.controls.occurred.value;
    const occurredOn = [
      occurred.year,
      String(occurred.month + 1).padStart(2, "0"),
      String(occurred.day).padStart(2, "0"),
    ].join("-");

    const category: CategoryAssignment = this.form.controls.category.value?.id
      ? {
          kind: "categorized",
          categoryId: this.form.controls.category.value.id,
        }
      : {
          kind: "uncategorized",
        };

    const transaction: AddTransaction = {
      category,
      amountInCents: Math.round(amount * 100),
      description: this.form.value.description ?? "",
      occurredOn: occurredOn,
      type: this.form.value.type!,
    };

    if (this.transactionId) {
      this.store.dispatch(
        updateTransaction({
          id: this.transactionId,
          changes: transaction,
        }),
      );
    } else {
      this.store.dispatch(addTransaction({ transaction }));
    }
  }
}
