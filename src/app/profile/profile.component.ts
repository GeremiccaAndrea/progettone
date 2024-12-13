import { Component } from '@angular/core';
import { Post } from '../post.model';
import { Auth, User } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Profile } from '../profile.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent {
  posts: Post[] = [new Post('Anziata sgozzata', 'Anziana tragicamente sgozzata al parco', 'Omicidio')];
  profilo : Profile | null;
  constructor(private auth: Auth,  private router: Router, private route: ActivatedRoute) {
    // Controllo se il profilo visualizza è quello dell'utente loggato
    if (this.auth.currentUser.uid == this.profilo.uid) {
      this.router.navigate([`/account`]);
    }
   }
 
   // Generazione Post casuale (per test)
   addPost() {
      const randomWords = ['Lorem', 'Ipsum', 'Dolor', 'Sit', 'Amet', 'Consectetur', 'Adipiscing', 'Elit'];
      const getRandomWord = () => randomWords[Math.floor(Math.random() * randomWords.length)];
      const getRandomPost = () => new Post(getRandomWord(), getRandomWord(), getRandomWord());

      this.posts.push(getRandomPost());
   }

}
