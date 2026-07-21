import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Store } from "@ngrx/store";
import { selectTransactionsState } from "../../state/transactions/transactions.selector";

@Component({
  selector: "app-home",
  imports: [AsyncPipe, JsonPipe],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  private readonly store = inject(Store);

  protected readonly transactionsState$ = this.store.select(
    selectTransactionsState,
  );
}
