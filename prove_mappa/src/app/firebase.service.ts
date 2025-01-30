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
  private messageSource = new BehaviorSubject<boolean>(false);
  private userSource = new BehaviorSubject<AngularFireUser | null>(null);
  message = this.messageSource.asObservable();
  user = this.userSource.asObservable();
  constructor(private auth: Auth, private firestore: Firestore) { }

   //#region LOGIN
   async Login( email: string, password: string)  {
    try {
      //await setPersistence(this.auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.userSource.next(userCredential.user);
      //const user: AngularFireUser = userCredential.user;
      this.messageSource.next(true);
      console.log(`Login successful! Welcome, ${userCredential.user.displayName}`);    
    } catch (error) {
      this.messageSource.next(false);
      console.error('Login error:', error);
    }
  }
  //#endregion

  //#region SIGNUP
  async SignUp(firstName: string, lastName: string, username: string, email: string, password: string) {
    try {
      // Crea l'utente
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user: AngularFireUser = userCredential.user;
      await this.SetDisplayName(user, username);
      this.messageSource.next(true);
    } catch (error) {
      this.messageSource.next(false);
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
