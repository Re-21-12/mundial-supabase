import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreditcionClient } from './preditcion-client';

describe('PreditcionClient', () => {
  let component: PreditcionClient;
  let fixture: ComponentFixture<PreditcionClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreditcionClient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreditcionClient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
