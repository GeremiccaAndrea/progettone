import { Component, OnInit } from '@angular/core';
import { Auth, authInstance$, User  } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Post } from '../post.model';
import { FirebaseService } from '../firebase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  utente !: User | null;
  // Array dei post
  // Sarà popolato con i dati del database
  posts: Post[] = [];

  constructor(private firebase: FirebaseService, public auth: Auth, private router: Router, private route: ActivatedRoute) { 
    // Controllo se il profilo visualizza è quello dell'utente loggato
    /*
    if (this.auth.currentUser.uid == this.profilo.uid) {
      this.router.navigate([`/account`]);}
    */
   }
  
   ngOnInit() {
    const token = sessionStorage.getItem('userToken');
    if (token) {
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.utente = user;
        }
      });
    }
    console.log(this.utente);
    console.log(this.auth.currentUser);
    // Recupero i post dal database
    
   }


}