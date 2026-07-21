import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { TuiButton, TuiInput, TuiTextfield } from "@taiga-ui/core";
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
import { addTransaction } from "../../state/transactions/transactions.actions";
import { AddTransaction, TransactionType } from "../../data/models";
import { MaskitoDirective } from "@maskito/angular";
import { type MaskitoOptions } from "@maskito/core";

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
  ],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
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
    label: "Add transactions",
    closable: true,
  };

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

    this.store.dispatch(addTransaction({ transaction }));
    this.close();
  }
}
