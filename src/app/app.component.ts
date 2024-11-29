import { Component } from '@angular/core';
import { FirestoreModule } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { createUserWithEmailAndPassword, User } from 'firebase/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private auth: Auth) {

    if(auth.currentUser) {
      console.log('Already logged in, User:', auth.currentUser);
    }
    

}

/* ngOnInit(auth: Auth) {
  if(auth.currentUser) {
    console.log('Already logged in, User:', auth.currentUser);
  } 
} */
}
