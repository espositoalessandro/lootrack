import { Component, signal } from "@angular/core";
import { TUI_LIQUID_GLASS, TuiButton, TuiTitle } from "@taiga-ui/core";
import { TuiAppBar } from "@taiga-ui/layout";
import { TuiPlatform } from "@taiga-ui/cdk";

@Component({
  selector: "app-floating-header",
  imports: [TuiButton, TuiAppBar, TuiPlatform, TuiTitle],
  providers: [{ provide: TUI_LIQUID_GLASS, useValue: true }],
  templateUrl: "./floating-header.html",
  styleUrl: "./floating-header.scss",
})
export class FloatingHeader {
  protected menuOpen = signal(false);
  protected readonly blur = signal(false);
}
