import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicTable } from './dynamic-table';

describe('DynamicTable', () => {
  let component: DynamicTable;
  let fixture: ComponentFixture<DynamicTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
