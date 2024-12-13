import { Component } from '@angular/core';
import { FirestoreModule } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { createUserWithEmailAndPassword, User } from 'firebase/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private auth: Auth, private router: Router) {}

  searchUser(userName: HTMLInputElement) {
    let valueUserName = userName.value;
    this.router.navigate(['/profile/', valueUserName]);
  }

/* ngOnInit(auth: Auth) {
  if(auth.currentUser) {
    console.log('Already logged in, User:', auth.currentUser);
  } 
} */
}
