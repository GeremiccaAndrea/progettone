import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../firebase.service';

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

  constructor(
    public firebase : FirebaseService,
    private router: Router, 
    private route: ActivatedRoute) {}

  ngOnInit() { 

  } 

  //#region LOGIN
  login() {

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