import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchSignal = signal<string>('');
  
  searchTerm = this.searchSignal.asReadonly();

  setSearchTerm(term: string) {
    this.searchSignal.set(term);
  }

  clearSearch() {
    this.searchSignal.set('');
  }
}
