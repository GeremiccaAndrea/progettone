import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrimeReportComponent } from './crime-report.component';

describe('CrimeReportComponent', () => {
  let component: CrimeReportComponent;
  let fixture: ComponentFixture<CrimeReportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CrimeReportComponent]
    });
    fixture = TestBed.createComponent(CrimeReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
