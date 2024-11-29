import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; 
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from 'src/environments/environment';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { LoginComponent } from './login/login.component';
import { AngularFireModule, FIREBASE_OPTIONS } from '@angular/fire/compat';
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { AppRoutingModule } from './app-routing.module';
import { SignupComponent } from './signup/signup.component';
import { ProfileComponent } from './profile/profile.component';
import { PostComponent } from './post/post.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SignupComponent,
    ProfileComponent,
    PostComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    provideFirebaseApp( () => initializeApp(environment.firebaseConfig)), 
    provideFirestore(() => getFirestore()), 
    provideAuth(() => getAuth()), AppRoutingModule
  ],
  providers: [ 
    { provide: FIREBASE_OPTIONS, useValue: environment.firebaseConfig },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
