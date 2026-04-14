import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BluetoothConnection } from './bluetooth-connection';

describe('BluetoothConnection', () => {
  let component: BluetoothConnection;
  let fixture: ComponentFixture<BluetoothConnection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BluetoothConnection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BluetoothConnection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
