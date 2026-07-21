import { TestBed } from "@angular/core/testing";
import { MockStore, provideMockStore } from "@ngrx/store/testing";

import { App } from "./app";
import { loadTransactions } from "./state/transactions/transactions.actions";

describe("App", () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideMockStore()],
    });

    TestBed.overrideComponent(App, {
      set: {
        imports: [],
        template: "",
      },
    });

    store = TestBed.inject(MockStore);
  });

  it("should request transactions when initialized", () => {
    const dispatchSpy = vi.spyOn(store, "dispatch");

    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(loadTransactions());
  });
});
