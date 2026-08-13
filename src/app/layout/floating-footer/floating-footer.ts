import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { TuiTabBarComponent, TuiTabBarItem } from "@taiga-ui/addon-mobile";
import { TuiButton } from "@taiga-ui/core";

@Component({
  selector: "app-floating-footer",
  imports: [
    RouterLink,
    TuiTabBarComponent,
    TuiTabBarItem,
    TuiButton,
    RouterLinkActive,
  ],
  templateUrl: "./floating-footer.html",
  styleUrl: "./floating-footer.scss",
})
export class FloatingFooter {}
