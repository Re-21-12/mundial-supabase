import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedDisplay } from './selected-display';

describe('SelectedDisplay', () => {
  let component: SelectedDisplay;
  let fixture: ComponentFixture<SelectedDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectedDisplay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
