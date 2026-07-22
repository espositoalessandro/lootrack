import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { Store } from "@ngrx/store";
import { selectTotalsByMonth } from "../../state/transactions/transactions.selector";
import { TuiHeader } from "@taiga-ui/layout";
import { TuiButton, TuiTitle } from "@taiga-ui/core";
import { AmountPipe } from "../../shared/pipes/amount-pipe";
import { TuiStatus } from "@taiga-ui/kit";

@Component({
  selector: "app-home",
  imports: [
    TuiHeader,
    TuiButton,
    TuiTitle,
    AmountPipe,
    CurrencyPipe,
    DatePipe,
    TuiStatus,
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  private readonly store = inject(Store);

  protected readonly currentMonth = signal(
    new Date().toISOString().slice(0, 7),
  );

  protected monthIncomesExpenses = computed(() =>
    this.store.selectSignal(selectTotalsByMonth(this.currentMonth()))(),
  );

  protected monthNet = computed(
    () =>
      this.monthIncomesExpenses().totalIncome -
      this.monthIncomesExpenses().totalExpense,
  );
}
