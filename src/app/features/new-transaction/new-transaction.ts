import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { TuiButton, TuiInput, TuiTextfield } from "@taiga-ui/core";
import { TuiSheetDialog, TuiSheetDialogOptions } from "@taiga-ui/addon-mobile";
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
  ],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction {
  private readonly router = inject(Router);
  protected form = new FormGroup({
    amountInCents: new FormControl("", Validators.required),
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
    console.log(this.form.value);
  }
}
