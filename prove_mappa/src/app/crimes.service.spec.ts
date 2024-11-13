import { TestBed } from '@angular/core/testing';

import { CrimesService } from './crimes.service';

describe('CrimesService', () => {
  let service: CrimesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrimesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
