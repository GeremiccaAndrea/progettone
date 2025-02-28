import { TestBed } from '@angular/core/testing';

import { CrimeReportService } from './crime-report.service';

describe('CrimeReportService', () => {
  let service: CrimeReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrimeReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
