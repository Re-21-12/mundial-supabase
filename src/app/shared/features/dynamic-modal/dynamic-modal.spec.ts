import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicModal } from './dynamic-modal';

describe('DynamicModal', () => {
  let component: DynamicModal;
  let fixture: ComponentFixture<DynamicModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
