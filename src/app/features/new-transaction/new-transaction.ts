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
import { TuiAnimated, TuiAutoFocus, TuiDay } from "@taiga-ui/cdk";
import { TuiInputDate, TuiInputDateTime } from "@taiga-ui/kit";
import { Store } from "@ngrx/store";
import { addTransaction } from "../../state/transactions/transactions.actions";
import { AddTransaction } from "../../data/models";

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
    TuiAutoFocus,
  ],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction {
  private readonly store = inject(Store);

  private readonly router = inject(Router);
  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    occurred: new FormControl<TuiDay>(TuiDay.currentLocal(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    description: new FormControl("", {
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
    const occurred = this.form.controls.occurred.value;
    const occurredOn = [
      occurred.year,
      String(occurred.month + 1).padStart(2, "0"),
      String(occurred.day).padStart(2, "0"),
    ].join("-");
    const transaction: AddTransaction = {
      amountInCents: Math.round(this.form.controls.amount.value! * 100),
      description: this.form.value.description ?? "",
      occurredOn: occurredOn,
      type: "expense",
    };

    this.store.dispatch(addTransaction({ transaction }));
    this.close();
  }
}
