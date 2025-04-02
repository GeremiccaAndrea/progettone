import { Component, EventEmitter, Output } from '@angular/core';

// Definisce la struttura dei dati emessi dall'evento di ricerca
export interface SearchEvent {
  type: 'users' | 'cities'; // Tipo di ricerca (puoi usare string se preferisci)
  term: string;             // Termine di ricerca inserito
}

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'] // O .scss, .less etc.
})
export class SearchBarComponent {

  // @Output per emettere l'evento di ricerca al componente genitore
  @Output() searchPerformed = new EventEmitter<SearchEvent>();

  // Proprietà legate al template tramite ngModel
  searchTerm: string = '';
  searchType: 'users' | 'cities' = 'cities'; // Valore predefinito

  constructor() { }

  // Metodo chiamato quando l'utente avvia la ricerca (es. click sul bottone)
  onSearch(): void {
    console.log(`SearchBar: Emitting search for type "${this.searchType}" with term "${this.searchTerm}"`);
    // Emette l'oggetto SearchEvent
    this.searchPerformed.emit({
      type: this.searchType,
      term: this.searchTerm.trim() // Rimuove spazi bianchi iniziali/finali
    });
  }

  // (Opzionale) Metodo per cercare premendo Invio nell'input
  onEnterPress(): void {
      this.onSearch();
  }
}