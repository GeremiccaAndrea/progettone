import { Component } from '@angular/core';
import { Post } from '../post.model';
import { Auth, User } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  posts: Post[] = [new Post('Anziata sgozzata', 'Anziana tragicamente sgozzata al parco', 'Omicidio')];
  profilo : User | null;
  logged : boolean = false;
  constructor(private auth: Auth,  private router: Router, private route: ActivatedRoute) {
    this.profilo = this.auth.currentUser;
    if (this.profilo) {
      let nome = this.profilo.displayName;
    } else {
      console.error('User profile is null');
      this.router.navigate(['/login']);
    }
    

    if(auth.currentUser) {
      console.log('Already logged in, User:', auth.currentUser);
      this.logged = true;
  
    } else {
      console.log('Not logged in');
      this.logged = false;
    }
   }
 
   logout() {
    if (this.logged = true) {
     this.auth.signOut();
     this.logged = false;
     window.location.reload();

   } }

   addPost() {
      const randomWords = ['Lorem', 'Ipsum', 'Dolor', 'Sit', 'Amet', 'Consectetur', 'Adipiscing', 'Elit'];
      const getRandomWord = () => randomWords[Math.floor(Math.random() * randomWords.length)];
      const getRandomPost = () => new Post(getRandomWord(), getRandomWord(), getRandomWord());

      this.posts.push(getRandomPost());
   }

}
