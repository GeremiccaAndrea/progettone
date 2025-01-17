import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as AngularFireUser } from '@angular/fire/auth';
import { updateProfile } from 'firebase/auth';
import { Firestore, getDoc, deleteDoc, doc, limit, setDoc, collection, query, getDocs, where, collectionData } from '@angular/fire/firestore';
import { setPersistence, browserSessionPersistence } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(private auth: Auth, private firestore: Firestore) { }

   //#region LOGIN
   async Login( email :string, password: string) {
    
    try {

      //await setPersistence(this.auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user: AngularFireUser = userCredential.user;
      console.log(`Login successful! Welcome, ${user.displayName}`);
    } catch (error) {
      console.error('Login error:', error);
    }
  }
  //#endregion
}
