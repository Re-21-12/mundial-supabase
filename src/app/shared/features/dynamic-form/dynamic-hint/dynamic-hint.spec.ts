import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicHint } from './dynamic-hint';

describe('DynamicHint', () => {
  let component: DynamicHint;
  let fixture: ComponentFixture<DynamicHint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicHint]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicHint);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
