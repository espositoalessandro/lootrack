import { TuiRoot } from "@taiga-ui/core";
import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FloatingFooter } from "./layout/floating-footer/floating-footer";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, TuiRoot, FloatingFooter, FloatingFooter],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {}
