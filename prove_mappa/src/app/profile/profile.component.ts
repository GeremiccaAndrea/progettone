import { Component, OnInit } from '@angular/core';
import { Auth, authInstance$, User  } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Post } from '../post.model';
import { FirebaseService } from '../firebase.service';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  utente !: User | null;
  logged: boolean = false;
  // Array dei post
  // Sarà popolato con i dati del database
  posts: Post[] = [];

  constructor(public auth: Auth, private router: Router, private route: ActivatedRoute, private session: SessionService) { 
    // Controllo se il profilo visualizza è quello dell'utente loggato
    /*
    if (this.auth.currentUser.uid == this.profilo.uid) {
      this.router.navigate([`/account`]);}
    */
   }
  
   ngOnInit() {
    const token = this.session.getToken();
    if (token) {
      this.auth.onAuthStateChanged(user => {
      if (user) {
        this.utente = user;
        this.logged = true;
      } else {  
        this.router.navigate(['/login']);
      }
      });
    }
   }
}