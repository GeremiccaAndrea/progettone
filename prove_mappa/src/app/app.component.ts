import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';
import { SessionService } from './session.service';
import { SearchEvent } from './search-bar/search-bar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  utente: any;
  isLoggedIn: boolean = false;
  lastSearch: SearchEvent | null = null; // Per memorizzare l'ultima ricerca

  constructor(private auth: Auth, private session: SessionService, private router: Router) {}

  // Metodo chiamato quando l'evento 'searchPerformed' viene emesso da SearchBarComponent
  handleSearch(event: SearchEvent): void {
    console.log('AppComponent: Received search event:', event);
    this.lastSearch = event;

    // Qui è dove implementeresti la logica di ricerca effettiva:
    // 1. Chiama un servizio (es. SearchService)
    // 2. Passa event.type e event.term al servizio
    // 3. Il servizio fa una chiamata HTTP all'API appropriata
    // 4. Aggiorna una variabile con i risultati per mostrarli nel template

    // Esempio di logica fittizia:
    let query = event.type + '/'+ event.term;
    window.location.href = '/' + query;
    
  }
 
  ngOnInit() {
    this.checkLoginStatus();
  
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkLoginStatus();
      });
  }

  logout() {
    this.auth.signOut().then(() => {
      this.session.clearSession();
      this.isLoggedIn = false;
      window.location.assign('/');
    });
  }

  currentLogin(): boolean{
    return this.router.url == "/login" || this.router.url == "/signup";
  }

  goHome() {
    this.router.navigate(['']);
  }

  checkLoginStatus() {
    this.isLoggedIn = this.session.isLoggedIn();
  }

  searchSubmit(query: HTMLInputElement): void {
    let url = 'users/'+ query.value;
    window.location.href = '/' + url;
  }

}