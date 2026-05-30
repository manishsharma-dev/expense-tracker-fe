import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Earnings } from './earnings';

describe('Earnings', () => {
  let component: Earnings;
  let fixture: ComponentFixture<Earnings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Earnings],
    }).compileComponents();

    fixture = TestBed.createComponent(Earnings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
