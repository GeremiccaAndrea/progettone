import { TestBed } from '@angular/core/testing';

import { MongoDBService } from './mongo-db.service';

describe('MongoDBService', () => {
  let service: MongoDBService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MongoDBService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
