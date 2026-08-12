import { Location } from "@angular/common";
import { Component, inject, output, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  PRIMARY_OUTLET,
  Router,
  RouterLink,
} from "@angular/router";
import { filter } from "rxjs";
import {
  TUI_DARK_MODE,
  TUI_LIQUID_GLASS,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiOption,
  TuiTitle,
} from "@taiga-ui/core";
import { TuiAppBar } from "@taiga-ui/layout";
import { TuiPlatform } from "@taiga-ui/cdk";
import { TranslocoPipe } from "@jsverse/transloco";
import { BUILD_INFO } from "../../core/generated/build-info";
import { Store } from "@ngrx/store";
import {
  selectHasConflicts,
  selectPendingEntityCount,
  selectSyncConnectionStatus,
} from "../../state/sync/sync.selector";
import { connectSync } from "../../state/sync/sync.actions";
import { TuiBadgeNotification } from "@taiga-ui/kit";

interface HeaderConfig {
  readonly title: string;
  readonly leading: "menu" | "back";
}

const DEFAULT_HEADER: HeaderConfig = {
  title: "Lootrack",
  leading: "menu",
};

@Component({
  selector: "app-floating-header",
  imports: [
    TuiButton,
    TuiAppBar,
    TuiPlatform,
    TuiTitle,
    TuiDropdown,
    TuiOption,
    TuiDataList,
    RouterLink,
    TuiIcon,
    TranslocoPipe,
    TuiBadgeNotification,
  ],
  providers: [{ provide: TUI_LIQUID_GLASS, useValue: true }],
  templateUrl: "./floating-header.html",
  styleUrl: "./floating-header.scss",
})
export class FloatingHeader {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly store = inject(Store);

  protected readonly menuOpen = signal(false);
  protected readonly header = signal<HeaderConfig>(DEFAULT_HEADER);
  protected readonly menuSettingsOpen = signal(false);
  protected readonly darkMode = inject(TUI_DARK_MODE);

  protected readonly syncStatus = this.store.selectSignal(
    selectSyncConnectionStatus,
  );
  protected readonly pendingCount = this.store.selectSignal(
    selectPendingEntityCount,
  );

  protected readonly hasConflicts = this.store.selectSignal(selectHasConflicts);

  protected readonly buildInfo = BUILD_INFO;
  protected readonly toggleDarkMode = output();
  constructor() {
    this.updateHeader();

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.updateHeader();
      });
  }

  protected enableDarkMode() {
    this.toggleDarkMode.emit();
  }

  protected goBack(): void {
    const previousNavigation =
      this.router.lastSuccessfulNavigation()?.previousNavigation;

    if (previousNavigation) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl("/");
  }

  protected connectSynchronization(): void {
    this.store.dispatch(connectSync());
  }

  private updateHeader(): void {
    const route = this.getPrimaryLeaf(this.router.routerState.snapshot.root);

    const config = route.data["header"] as HeaderConfig | undefined;

    this.header.set(config ?? DEFAULT_HEADER);
  }

  private getPrimaryLeaf(
    route: ActivatedRouteSnapshot,
  ): ActivatedRouteSnapshot {
    const primaryChild = route.children.find(
      (child) => child.outlet === PRIMARY_OUTLET,
    );

    return primaryChild ? this.getPrimaryLeaf(primaryChild) : route;
  }
}
