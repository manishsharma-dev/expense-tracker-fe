import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileLogin } from './mobile-login';

describe('MobileLogin', () => {
  let component: MobileLogin;
  let fixture: ComponentFixture<MobileLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
