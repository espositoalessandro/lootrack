import { TuiRoot } from "@taiga-ui/core";
import { Component, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FloatingFooter } from "./pages/components/floating-footer/floating-footer";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, TuiRoot, FloatingFooter],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  protected readonly title = signal("lootrack");
}
