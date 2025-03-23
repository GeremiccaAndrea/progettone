import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MapComponent } from './map/map.component';
import { SignupComponent } from './signup/signup.component';
import { ProfileComponent } from './profile/profile.component';
import { CrimeReportComponent } from './crime-report/crime-report.component';
import { UserComponent } from './user/user.component';
import { SearchUsersComponent } from './search-users/search-users.component';
const routes: Routes = [
  // L'URL vuoto reindirizza alla mappa
  { path: '', component: MapComponent },
  // Le altre pagine
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'report', component: CrimeReportComponent },
  { path: 'users/:searchedUser', component: SearchUsersComponent },
  { path: 'user/:uid', component: UserComponent },
];

@NgModule({
  declarations: [],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

 }
