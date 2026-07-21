import { Directive } from "@angular/core";
import { tuiAutoFocusOptionsProvider } from "@taiga-ui/cdk";

@Directive({
  selector: "[appDelayedAutoFocus]",
  providers: [
    tuiAutoFocusOptionsProvider({
      delay: 300,
      preventScroll: true,
    }),
  ],
})
export class DelayedAutoFocus {}
