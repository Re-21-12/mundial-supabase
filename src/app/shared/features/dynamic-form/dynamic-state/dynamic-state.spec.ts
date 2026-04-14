import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicState } from './dynamic-state';

describe('DynamicState', () => {
  let component: DynamicState;
  let fixture: ComponentFixture<DynamicState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicState]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicState);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
