import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  utente: any;
  logged: boolean = false;

  constructor(private auth: Auth, private router: Router) {}

  ngOnInit() {
    const token = sessionStorage.getItem('userToken');
    if (token) {
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.utente = user;
          this.logged = true;
        }
      });
    }
  }
}