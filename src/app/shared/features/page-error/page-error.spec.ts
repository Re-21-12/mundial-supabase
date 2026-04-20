import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageError } from './page-error';

describe('PageError', () => {
  let component: PageError;
  let fixture: ComponentFixture<PageError>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageError]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageError);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
