import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "amount",
  standalone: true,
})
export class AmountPipe implements PipeTransform {
  transform(amountInCents: number | null | undefined): number | null {
    if (amountInCents == null) {
      return null;
    }

    return amountInCents / 100;
  }
}
