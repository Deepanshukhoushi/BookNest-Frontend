import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SearchService]
    });
    service = TestBed.inject(SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial empty search term', () => {
    expect(service.searchTerm()).toBe('');
  });

  it('should set search term', () => {
    service.setSearchTerm('angular');
    expect(service.searchTerm()).toBe('angular');
  });

  it('should clear search term', () => {
    service.setSearchTerm('angular');
    service.clearSearch();
    expect(service.searchTerm()).toBe('');
  });
});
