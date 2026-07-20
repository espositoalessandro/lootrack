import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { TuiButton } from "@taiga-ui/core";
import { TuiSheetDialog, TuiSheetDialogOptions } from "@taiga-ui/addon-mobile";
import { TuiFloatingContainer } from "@taiga-ui/layout";
import { TranslocoPipe } from "@jsverse/transloco";

@Component({
  selector: "app-new-transaction",
  imports: [TuiButton, TuiSheetDialog, TuiFloatingContainer, TranslocoPipe],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction {
  private readonly router = inject(Router);

  protected readonly open = true;

  protected readonly options: Partial<TuiSheetDialogOptions> = {
    label: "Add transaction",
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
}
