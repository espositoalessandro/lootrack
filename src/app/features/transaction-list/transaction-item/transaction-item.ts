import { Component, input } from "@angular/core";
import { Transaction } from "../../../data/models";
import { CurrencyPipe } from "@angular/common";
import { TuiCard } from "@taiga-ui/layout";
import { TuiTitle } from "@taiga-ui/core";
import { AmountPipe } from "../../../shared/pipes/amount-pipe";

@Component({
  selector: "app-transaction-item",
  imports: [TuiCard, TuiTitle, CurrencyPipe, AmountPipe],
  templateUrl: "./transaction-item.html",
  styleUrl: "./transaction-item.scss",
})
export class TransactionItem {
  transaction = input.required<Transaction>();
}
