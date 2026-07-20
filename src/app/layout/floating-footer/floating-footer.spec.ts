import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FloatingFooter } from "./floating-footer";

describe("FloatingFooter", () => {
  let component: FloatingFooter;
  let fixture: ComponentFixture<FloatingFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingFooter],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
