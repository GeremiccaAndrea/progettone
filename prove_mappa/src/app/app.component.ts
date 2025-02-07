import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';
import { SessionService } from './session.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  utente: any;
  isLoggedIn: boolean = false;

  constructor(private auth: Auth, private session: SessionService, private router: Router) {}

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
    return this.router.url == "/login";
  }

  goHome() {
    this.router.navigate(['']);
  }

  checkLoginStatus() {
    this.isLoggedIn = this.session.isLoggedIn();
  }
}