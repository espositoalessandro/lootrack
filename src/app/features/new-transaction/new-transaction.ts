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
import { TuiAnimated, TuiDay } from "@taiga-ui/cdk";
import { TuiInputDate, TuiInputDateTime, TuiSegmented } from "@taiga-ui/kit";
import { Store } from "@ngrx/store";
import {
  addTransaction,
  addTransactionSuccess,
  updateTransaction,
  updateTransactionSuccess,
} from "../../state/transactions/transactions.actions";
import {
  AddTransaction,
  Transaction,
  TransactionType,
} from "../../data/models";
import { MaskitoDirective } from "@maskito/angular";
import { type MaskitoOptions } from "@maskito/core";
import { selectTransactionById } from "../../state/transactions/transactions.selector";
import { filter, take, tap } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Actions, createEffect, ofType } from "@ngrx/effects";

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

  readonly closeTransactionSheet$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addTransactionSuccess, updateTransactionSuccess),
        tap(() => {
          void this.router.navigate([
            {
              outlets: {
                sheet: null,
              },
            },
          ]);
        }),
      ),
    { dispatch: false },
  );

  ngOnInit(): void {
    if (!this.transactionId) {
      return;
    }

    this.store
      .select(selectTransactionById(this.transactionId))
      .pipe(
        filter(
          (transaction): transaction is Transaction =>
            transaction !== undefined,
        ),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((transaction) => {
        this.prefillForm(transaction);
      });
  }

  private prefillForm(transaction: Transaction): void {
    const [year, month, day] = transaction.occurredOn.split("-").map(Number);

    this.form.setValue({
      amount: (transaction.amountInCents / 100).toFixed(2),

      occurred: new TuiDay(year, month - 1, day),

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
    const transaction: AddTransaction = {
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
