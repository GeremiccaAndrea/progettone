import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../firebase.service';
import { EmailAuthCredential } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  firstNameSignUp: string = '';
  lastNameSignUp: string = '';
  usernameSignUp: string = '';
  emailSignUp: string = '';
  passwordSignUp: string = '';
  isDisabled: boolean = false;
  message : any = "";

  constructor(public firebase : FirebaseService, private auth: Auth, private session: SessionService) {}

  ngOnInit() { } 

  //#region SIGNUP
  signup(firstName: HTMLInputElement, lastName: HTMLInputElement, username: HTMLInputElement, email: HTMLInputElement, password: HTMLInputElement) {
    this.firstNameSignUp = firstName.value;
    this.lastNameSignUp = lastName.value;
    this.usernameSignUp = username.value;
    this.emailSignUp = email.value;
    this.passwordSignUp = password.value;
    this.firebase.SignUp(this.firstNameSignUp, this.lastNameSignUp, this.usernameSignUp, this.emailSignUp, this.passwordSignUp);
    this.firebase.message.subscribe(message => {
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
    console.log("Messaggio: [ " + this.message + " ]");

    
  }
  //#endregion
}
