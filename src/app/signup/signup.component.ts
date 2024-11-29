import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as AngularFireUser } from '@angular/fire/auth';
import { updateProfile } from 'firebase/auth';
import { Firestore, getDoc, deleteDoc, doc, limit, setDoc, collection, query, getDocs, where, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  //#region SIGNUP

  usernameSignUp: string = '';
  emailSignUp: string = '';
  passwordSignUp: string = '';
  messageSignUp: string = '';

  constructor(private auth: Auth, private firestore: Firestore) {}

  async SignUp() {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, this.emailSignUp, this.passwordSignUp);
      const user: AngularFireUser = userCredential.user;
      await this.SetDisplayName(user, this.usernameSignUp);
    } catch (error) {
      this.messageSignUp = 'Sign Up failed. Please check your inputs.';
      console.error('Sign Up error:', error);
    }
  }

  async SetDisplayName(user: AngularFireUser, displayName: string): Promise<void> {
    if (user) {
      try {

        await updateProfile(user, { displayName });
        console.log('Display name set to:', displayName);
      } catch (error) {
        console.error('Error setting display name:', error);
        this.messageSignUp = 'Failed to set username. Please check your connection';
      }
    }
  }
  //#endregion

  //#region WRITE
  async CreateUserDocument(userId: string, username: string, email: string) {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      await setDoc(userRef, {
        username: username,
        email: email,
        age: Math.floor(Math.random() * 99) + 1
      });
      console.log('User document created with ID:', userId);
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }
  //#region 

}
