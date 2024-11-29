import { Component } from '@angular/core';
import { Post } from '../post.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  posts: Post[] = [new Post('Anziata sgozzata', 'Anziana tragicamente sgozzata al parco', 'Omicidio')];
  constructor() {
   
   }
 
   addPost() {
      const randomWords = ['Lorem', 'Ipsum', 'Dolor', 'Sit', 'Amet', 'Consectetur', 'Adipiscing', 'Elit'];
      const getRandomWord = () => randomWords[Math.floor(Math.random() * randomWords.length)];
      const getRandomPost = () => new Post(getRandomWord(), getRandomWord(), getRandomWord());

      this.posts.push(getRandomPost());
   }

}
