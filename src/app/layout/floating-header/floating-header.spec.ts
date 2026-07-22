import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FloatingHeader } from "./floating-header";

describe("FloatingHeader", () => {
  let component: FloatingHeader;
  let fixture: ComponentFixture<FloatingHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
