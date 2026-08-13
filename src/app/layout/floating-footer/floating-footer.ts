import { Component, computed, inject } from "@angular/core";
import {
  NavigationEnd,
  PRIMARY_OUTLET,
  Router,
  RouterLink,
} from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, startWith } from "rxjs";
import { TuiTabBarComponent, TuiTabBarItem } from "@taiga-ui/addon-mobile";

@Component({
  selector: "app-floating-footer",
  imports: [RouterLink, TuiTabBarComponent, TuiTabBarItem],
  templateUrl: "./floating-footer.html",
  styleUrl: "./floating-footer.scss",
})
export class FloatingFooter {
  private readonly router = inject(Router);
  private readonly navigation = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
    ),
  );

  protected readonly activeItemIndex = computed(() => {
    // Establish the NavigationEnd signal as a dependency
    this.navigation();
    const tree = this.router.parseUrl(this.router.url);
    const primary = tree.root.children[PRIMARY_OUTLET]?.segments[0]?.path ?? "";
    const sheet = tree.root.children["sheet"]?.segments[0]?.path;

    if (sheet === "new-transactions") {
      return 0;
    }

    switch (primary) {
      case "":
        return 1;
      case "list":
        return 2;
      case "pending-changes":
        return 3;
      default:
        return Number.NaN;
    }
  });
}
