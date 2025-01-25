import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as AngularFireUser } from '@angular/fire/auth';
import { updateProfile } from 'firebase/auth';
import { Firestore, getDoc, deleteDoc, doc, limit, setDoc, collection, query, getDocs, where, collectionData } from '@angular/fire/firestore';
import { setPersistence, browserSessionPersistence } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private messageSource = new BehaviorSubject<string>('');
  message = this.messageSource.asObservable();
  constructor(private auth: Auth, private firestore: Firestore) { }

   //#region LOGIN
   async Login( email: string, password: string)  {
    try {
      //await setPersistence(this.auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user: AngularFireUser = userCredential.user;
      this.messageSource.next('Login successful!');
      console.log(`Login successful! Welcome, ${user.displayName}`);    
    } catch (error) {
      this.messageSource.next('Login error');
      console.error('Login error:', error);
    }
  }
  //#endregion
  //#region SIGNUP
  async SignUp(firstName: string, lastName: string, username: string, email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user: AngularFireUser = userCredential.user;
      await this.SetDisplayName(user, username);
      this.messageSource.next( 'Sign Up successful!');
    } catch (error) {
      this.messageSource.next( 'Sign Up error');
      console.error('Sign Up error:', error);
    }
    console.log(this.message);
  }

  async SetDisplayName(user: AngularFireUser, displayName: string): Promise<void> {
    if (user) {
      try {
        await updateProfile(user, { displayName });
        console.log('Display name set to:', displayName);
      } catch (error) {
        console.error('Error setting display name:', error);
      }
    }
  }
  //#endregion
}
