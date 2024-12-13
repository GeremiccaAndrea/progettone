import { Component } from '@angular/core';
import { Post } from '../post.model';
import { Auth, User } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Profile } from '../profile.model';

@Component({
  selector: 'app-self-profile',
  templateUrl: './self-profile.component.html',
  styleUrls: ['./self-profile.component.css']
})
export class SelfProfileComponent {
  utente: User | null;
  logged: boolean = false;
  // Sample post
  posts: Post[] = [new Post('Anziata uccisa', 'Anziana tragicamente uccisa al parco', 'Omicidio')];
  constructor(private auth: Auth,  private router: Router, private route: ActivatedRoute) {
    this.utente = this.auth.currentUser;

    // Controllo se l'utente è loggato
    if (this.utente) {
      let nome = this.utente.displayName;
      this.logged = true;
    } else {
      this.logged = false;
      console.error('User profile is null');
      this.router.navigate(['/login']);
    }
   }
 
   logout() {
    if (this.logged = true) {
     this.auth.signOut();
     this.logged = false;
     window.location.reload();
   } 
  }

   /* Generazione Post casuale (per test)
   addPost() {
      const randomWords = ['Lorem', 'Ipsum', 'Dolor', 'Sit', 'Amet', 'Consectetur', 'Adipiscing', 'Elit'];
      const getRandomWord = () => randomWords[Math.floor(Math.random() * randomWords.length)];
      const getRandomPost = () => new Post(getRandomWord(), getRandomWord(), getRandomWord());

      this.posts.push(getRandomPost());
   } */

}

