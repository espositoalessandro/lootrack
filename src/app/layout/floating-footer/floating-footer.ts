import { Component } from "@angular/core";
import { TuiButtonGroup } from "@taiga-ui/kit";
import { TuiAppearance, TuiIcon } from "@taiga-ui/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-floating-footer",
  imports: [RouterLink, TuiIcon, TuiAppearance, TuiButtonGroup],
  templateUrl: "./floating-footer.html",
  styleUrl: "./floating-footer.scss",
})
export class FloatingFooter {}
