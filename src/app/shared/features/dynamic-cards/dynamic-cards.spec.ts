import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicCards } from './dynamic-cards';

describe('DynamicCards', () => {
  let component: DynamicCards;
  let fixture: ComponentFixture<DynamicCards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicCards]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicCards);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
