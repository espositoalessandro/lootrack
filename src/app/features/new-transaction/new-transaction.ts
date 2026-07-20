import { Component, OnInit } from "@angular/core";
import { TuiButton } from "@taiga-ui/core";
import { TuiSheetDialog, TuiSheetDialogOptions } from "@taiga-ui/addon-mobile";
import { TuiFloatingContainer } from "@taiga-ui/layout";

@Component({
  selector: "app-new-transaction",
  imports: [TuiButton, TuiSheetDialog, TuiFloatingContainer],
  templateUrl: "./new-transaction.html",
  styleUrl: "./new-transaction.scss",
})
export class NewTransaction implements OnInit {
  protected open = false;

  ngOnInit() {
    this.open = true;
  }

  protected readonly options: Partial<TuiSheetDialogOptions> = {
    label: "Alexander Inkin",
    closable: false,
  };
}
