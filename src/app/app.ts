import {
  TUI_DARK_MODE,
  TuiButton,
  TuiDialog,
  TuiLoader,
  TuiRoot,
  TuiScrollRef,
} from "@taiga-ui/core";
import { Component, effect, inject, OnInit, signal } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { Store } from "@ngrx/store";
import { loadCategories } from "./state/categories/categories.actions";
import { loadTransactions } from "./state/transactions/transactions.actions";
import {
  loadAppSettings,
  updateAppSettings,
} from "./state/app-settings/app-settings.actions";
import { selectAppSettings } from "./state/app-settings/app-settings.selector";
import {
  loadPendingChanges,
  synchronize,
  synchronizeConflictFailure,
} from "./state/sync/sync.actions";
import { TuiPullToRefresh } from "@taiga-ui/addon-mobile";
import { isAppLoading } from "./state/global.selector";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Actions, ofType } from "@ngrx/effects";
import { selectConflictCount } from "./state/sync/sync.selector";
import { FloatingHeader } from "./layout/floating-header/floating-header";
import { FloatingFooter } from "./layout/floating-footer/floating-footer";

@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    TuiRoot,
    TuiLoader,
    TuiPullToRefresh,
    TuiScrollRef,
    FloatingHeader,
    FloatingFooter,
    TuiDialog,
    TuiButton,
  ],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);

  protected readonly darkMode = inject(TUI_DARK_MODE);

  protected readonly isAppLoading = this.store.selectSignal(isAppLoading);
  protected readonly settings = this.store.selectSignal(selectAppSettings);

  protected conflictDialogOpen = signal(false);

  protected readonly conflictCount =
    this.store.selectSignal(selectConflictCount);

  constructor() {
    effect(() => {
      this.darkMode.set(this.settings().theme === "dark");
    });

    this.actions$
      .pipe(ofType(synchronizeConflictFailure), takeUntilDestroyed())
      .subscribe(() => {
        this.conflictDialogOpen.set(true);
      });
  }

  ngOnInit(): void {
    void this.initializeApp();
  }

  protected toggleDarkMode(): void {
    const theme = this.settings().theme === "dark" ? "light" : "dark";

    this.store.dispatch(
      updateAppSettings({
        newSettings: { theme },
      }),
    );
  }

  protected requestSynchronization(): void {
    this.store.dispatch(synchronize());
  }

  protected reviewConflicts(): void {
    this.conflictDialogOpen.set(false);
    void this.router.navigateByUrl("/pending-changes");
  }

  private async initializeApp(): Promise<void> {
    this.store.dispatch(loadCategories());
    this.store.dispatch(loadTransactions());
    this.store.dispatch(loadAppSettings());
    this.store.dispatch(loadPendingChanges());
  }
}
