import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../firebase.service';
import { EmailAuthCredential } from 'firebase/auth';

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
  message : any = 'Sign Up Place Holder';

  constructor(public firebase : FirebaseService) {}

  ngOnInit() { } 

  //#region SIGNUP
  signup(firstName: HTMLInputElement, lastName: HTMLInputElement, username: HTMLInputElement, email: HTMLInputElement, password: HTMLInputElement) {
    this.firstNameSignUp = firstName.value;
    this.lastNameSignUp = lastName.value;
    this.usernameSignUp = username.value;
    this.emailSignUp = email.value;
    this.passwordSignUp = password.value;
    this.firebase.SignUp(this.firstNameSignUp, this.lastNameSignUp, this.usernameSignUp, this.emailSignUp, this.passwordSignUp);
    this.firebase.message.subscribe(message => this.message = message);
    console.log("Messaggio: [ " + this.message + " ]");

    
  }
  //#endregion
}
