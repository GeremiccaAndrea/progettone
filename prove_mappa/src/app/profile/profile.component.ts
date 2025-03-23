import { Component, OnInit } from '@angular/core';
import { Auth, User, updateProfile } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Post } from '../post.model';
import { SessionService } from '../session.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  utente !: User | null;
  logged: boolean = false;
  edit : boolean = false;
  // Array dei post
  // Sarà popolato con i dati del database
  posts: Post[] = [];

  constructor(private auth: Auth, private router: Router, private session: SessionService, private http:  HttpClient) { 
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
        console.log(this.utente);
        this.logged = true;
        this.chiamata_db();
      } 
      });
    } else {  
      this.router.navigate(['/login']);
    }
    
    // Inizializzo i post

   }

   chiamata_db() {
       let apiUrl: string = 'http://127.0.0.1:41000/api/get_user_posts/' + this.utente?.uid;
       console.log(apiUrl);
       let headers = new HttpHeaders();
       headers = headers.set('Content-Type', 'application/json; charset=utf-8');
       this.http.get<Post[]>(apiUrl).pipe(
         catchError(error => {
           console.warn('Errore durante la richiesta:', error);
           if (error.status === 302) {
             console.warn('Reindirizzamento rilevato:', error.headers.get('Location'));
           }
           return of([]); // Restituisce un array vuoto in caso di errore
         })
       ).subscribe(data => {
         // Read the result field from the JSON response.
         this.posts = data;
    
         console.log(this.posts);
       });
      }
      
      modificaProfilo() {
      if (this.auth.currentUser) {
        this.edit = true;
      }
      }

      confermaModifica(photoURL:HTMLInputElement) {

        this.submitModifica(photoURL.value)
        this.edit = false;
      }

      annulla() {
        this.edit = false;
      }

      submitModifica(photoURL:string) {
        if (this.auth.currentUser) {
          updateProfile(this.auth.currentUser, {
            photoURL: photoURL
          }).then(() => {
            // Profile updated!
            // ...
          }).catch((error) => {
            // An error occurred
            // ...
          });
        } else {
          console.error('No user is currently logged in.');
        }
      }
      
  
}