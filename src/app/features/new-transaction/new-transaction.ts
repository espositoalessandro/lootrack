import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { TuiButton, TuiInput, TuiTextfield } from "@taiga-ui/core";
import {
  TuiMobileCalendarDropdown,
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
import { TuiAnimated } from "@taiga-ui/cdk";
import { TuiInputDateTime } from "@taiga-ui/kit";
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
    TuiMobileCalendarDropdown,
  ],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction {
  private readonly store = inject(Store);

  private readonly router = inject(Router);
  protected form = new FormGroup({
    amount: new FormControl(0, Validators.required),
    occurred: new FormControl(new Date(), Validators.required),
    description: new FormControl(""),
  });
  protected readonly open = true;

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
    const transaction: AddTransaction = {
      amountInCents: this.form.value.amount!,
      description: this.form.value.description ?? "",
      occurredOn: this.form.value.occurred!.toISOString(),
      type: "expense",
    };

    this.store.dispatch(addTransaction({ transaction }));
  }
}
