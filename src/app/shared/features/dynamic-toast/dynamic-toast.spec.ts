import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicToast } from './dynamic-toast';

describe('DynamicToast', () => {
  let component: DynamicToast;
  let fixture: ComponentFixture<DynamicToast>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicToast]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicToast);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
