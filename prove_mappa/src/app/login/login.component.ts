import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth, User  } from '@angular/fire/auth';
import { FirebaseService } from '../firebase.service';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  utente !: User | null;
  email: string = '';
  password: string = '';
  message: boolean = false;
  logged : boolean = false;
  usernameSignUp: string = '';
  emailSignUp: string = '';
  passwordSignUp: string = '';
  messageSignUp: string = '';
  isDisabled: boolean = false;

  constructor(public firebase : FirebaseService, public auth: Auth, private router: Router, private session : SessionService) {} 

  ngOnInit() {
    const token = this.session.getToken();
    if (token) {
      this.auth.onAuthStateChanged(user => {
      if (user) {
        this.utente = user;
        this.logged = true;
        console.log(this.utente);
        this.router.navigate(['/profile']);
      }
      });
    }
  }


  //#region LOGIN
  login(email: HTMLInputElement, password: HTMLInputElement,) {
    this.email = email.value;
    this.password = password.value;
    // Login 
    this.firebase.Login(this.email, this.password);
    // Messaggio di successo o errore
    this.firebase.message.subscribe(message => 
      {
      this.message = message
      if(this.message) {
        this.auth.onAuthStateChanged(user => {
          if (user) {
            user.getIdToken().then(token => this.session.setToken(token));
            window.location.assign('/');
          }
        });
      }
    });
  }
  //#endregion

  //#region QUERIES
  /*
  GetUsersByCondition(field: string, operator: any, value: any, limitNum: any): Observable<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where(field, operator, value), limit(limitNum));
    return collectionData(q);
  }*/
  //#endregion
}