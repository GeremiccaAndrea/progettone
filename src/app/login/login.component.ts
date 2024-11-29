import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as AngularFireUser } from '@angular/fire/auth';
import { updateProfile } from 'firebase/auth';
import { Firestore, getDoc, deleteDoc, doc, limit, setDoc, collection, query, getDocs, where, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { setPersistence, browserSessionPersistence } from 'firebase/auth';
import { AnonymousSubject } from 'rxjs/internal/Subject';


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

  constructor(private auth: Auth, private firestore: Firestore, private router: Router,
     private route: ActivatedRoute) {
      
     }

  routeToProfile(user: AngularFireUser) {
    this.router.navigate([`../profile`, { state: { user } }], { relativeTo: this.route });
  }

  //#region LOGIN
  async Login() {
    
    try {

      if(this.auth.currentUser != null) {
        console.log('Already logged in, User:', this.auth.currentUser);
        return;
      }

      await setPersistence(this.auth, browserSessionPersistence);

      const userCredential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      const user: AngularFireUser = userCredential.user;
      this.message = `Login successful! Welcome, ${user.displayName}`;
      this.logged = true;
      this.routeToProfile(user);
      console.log('User:', user);
      
    } catch (error) {
      this.message = 'Login failed. Please check your credentials.';
      this.logged = false;
      console.error('Login error:', error);
    }
  }
  //#endregion


  //#region QUERIES
  GetUsersByCondition(field: string, operator: any, value: any, limitNum: any): Observable<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where(field, operator, value), limit(limitNum));
    return collectionData(q);
  }
  //#endregion
}
