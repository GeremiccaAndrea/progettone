import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelfProfileComponent } from './self-profile.component';

describe('SelfProfileComponent', () => {
  let component: SelfProfileComponent;
  let fixture: ComponentFixture<SelfProfileComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SelfProfileComponent]
    });
    fixture = TestBed.createComponent(SelfProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
