import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent {
  constructor(private auth: Auth,  private router: Router, private route: ActivatedRoute) {
    // Controllo se il profilo visualizza è quello dell'utente loggato
    /*
    if (this.auth.currentUser.uid == this.profilo.uid) {
      this.router.navigate([`/account`]);}
    */
   }
 
   // Generazione Post casuale (per test)
   addPost() {}

}