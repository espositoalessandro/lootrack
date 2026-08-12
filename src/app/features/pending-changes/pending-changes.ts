import { Component, inject } from "@angular/core";
import { Store } from "@ngrx/store";

import {
  selectPendingChanges,
  selectPendingMutationCount,
} from "../../state/sync/sync.selector";
import { TuiAppearance } from "@taiga-ui/core";
import { DatePipe } from "@angular/common";

@Component({
  selector: "app-pending-changes",
  imports: [TuiAppearance, DatePipe],
  templateUrl: "./pending-changes.html",
})
export class PendingChanges {
  private readonly store = inject(Store);

  protected readonly pendingChanges =
    this.store.selectSignal(selectPendingChanges);

  protected readonly mutationCount = this.store.selectSignal(
    selectPendingMutationCount,
  );
}
