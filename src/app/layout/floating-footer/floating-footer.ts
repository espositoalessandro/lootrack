import { Component } from "@angular/core";
import { TuiActionBar } from "@taiga-ui/kit";
import { TuiButton, TuiIcon } from "@taiga-ui/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-floating-footer",
  imports: [TuiActionBar, TuiButton, RouterLink, TuiIcon],
  templateUrl: "./floating-footer.html",
  styleUrl: "./floating-footer.scss",
})
export class FloatingFooter {}
