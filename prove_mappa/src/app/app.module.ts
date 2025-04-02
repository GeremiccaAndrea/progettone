import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { CrimesService } from './crimes.service';
import { AppRoutingModule } from './app-routing.module';
import { AngularFireModule, FIREBASE_OPTIONS } from '@angular/fire/compat';
import { LoginComponent } from './login/login.component';
import { MapComponent } from './map/map.component';
import { firebaseConfig } from '../environments/environment';
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { SignupComponent } from './signup/signup.component';
import { ProfileComponent } from './profile/profile.component';
import { PostComponent } from './post/post.component';
import { CrimeReportComponent } from './crime-report/crime-report.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserComponent } from './user/user.component';
import { SearchUsersComponent } from './search-users/search-users.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MapComponent,
    SignupComponent,
    ProfileComponent,
    PostComponent,
    CrimeReportComponent,
    UserComponent,
    SearchUsersComponent,
    SearchBarComponent,

  ],
  imports: [
    BrowserModule, HttpClientModule, AppRoutingModule,
    ReactiveFormsModule, FormsModule,
    AngularFireModule.initializeApp(firebaseConfig),
    provideFirebaseApp( () => initializeApp(firebaseConfig)), 
    provideFirestore(() => getFirestore()), 
    provideAuth(() => getAuth()), AppRoutingModule
  ],
  providers: [
    CrimesService, { provide: FIREBASE_OPTIONS, useValue: firebaseConfig }],
  bootstrap: [AppComponent]
})
export class AppModule { }
