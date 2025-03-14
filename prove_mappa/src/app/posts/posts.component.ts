import { Component, OnInit } from '@angular/core';
import { Post } from '../post.model';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.css']
})
export class PostsComponent implements OnInit {
  alreadyLoaded: boolean = false;
  posts: Post[] = [];
  //apiUrl: string = 'https://world.openfoodfacts.org/api/v3/product/737628064502.json';
  constructor() {}
  data: any;

  ngOnInit() {
    
  }

  
}