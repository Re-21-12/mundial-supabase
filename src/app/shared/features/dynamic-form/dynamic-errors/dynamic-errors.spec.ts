import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicErrors } from './dynamic-errors';

describe('DynamicErrors', () => {
  let component: DynamicErrors;
  let fixture: ComponentFixture<DynamicErrors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicErrors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicErrors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
