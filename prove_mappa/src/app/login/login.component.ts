import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../firebase.service';
import { EmailAuthCredential } from 'firebase/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  message: string = '';
  logged : boolean = false;
  usernameSignUp: string = '';
  emailSignUp: string = '';
  passwordSignUp: string = '';
  messageSignUp: string = '';
  isDisabled: boolean = false;
  constructor(public firebase : FirebaseService) {}

  ngOnInit() { 
   

  } 

  //#region LOGIN
  login(email: HTMLInputElement, password: HTMLInputElement,) {
    console.log("Fatto")
    this.email = email.value;
    this.password = password.value;
    this.firebase.Login(this.email, this.password);
    this.firebase.message.subscribe(message => this.message = message);
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