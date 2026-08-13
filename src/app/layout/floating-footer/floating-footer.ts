import { Component } from "@angular/core";
import { TuiIcon } from "@taiga-ui/core";
import { RouterLink } from "@angular/router";
import { TuiTabBarComponent, TuiTabBarItem } from "@taiga-ui/addon-mobile";

@Component({
  selector: "app-floating-footer",
  imports: [RouterLink, TuiIcon, TuiTabBarComponent, TuiTabBarItem],
  templateUrl: "./floating-footer.html",
  styleUrl: "./floating-footer.scss",
  host: {
    "[attr.data-platform]": '"ios"',
    "[class.tui-liquid-glass]": "true",
  },
})
export class FloatingFooter {
  protected activeItemIndex = 1;
}
