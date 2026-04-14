import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Taste } from './taste';

describe('Taste', () => {
  let component: Taste;
  let fixture: ComponentFixture<Taste>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Taste]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Taste);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
