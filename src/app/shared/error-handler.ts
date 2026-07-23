import { ErrorHandler, inject } from "@angular/core";
import { TuiDialogService } from "@taiga-ui/core";

export class CategoryInUseError extends Error {
  constructor(readonly transactionCount: number) {
    super(
      `Category is used by ${transactionCount} active ${
        transactionCount === 1 ? "transaction" : "transactions"
      }`,
    );
  }
}

export class GlobalErrorHandler implements ErrorHandler {
  private readonly dialogs = inject(TuiDialogService);
  handleError(error: any) {
    if (error instanceof CategoryInUseError) {
      console.error(error);
      this.dialogs
        .open(
          "Error in deleting category<br /> You can't delete a categroy that has <strong>at least one</strong> linked transaction",
          { label: "Heading", size: "s" },
        )
        .subscribe();
    }
    console.error(GlobalErrorHandler.name, { error });
  }
}
