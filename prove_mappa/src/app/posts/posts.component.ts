import { Component, OnInit } from '@angular/core';
import { Post } from '../post.model';
import { catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.css']
})
export class PostsComponent implements OnInit {
  posts: Post[] = [];
  apiUrl: string = 'http://127.0.0.1:41000/api/get_all';
  //apiUrl: string = 'https://world.openfoodfacts.org/api/v3/product/737628064502.json';
  constructor(private http: HttpClient) {}
  data: any;

  ngOnInit() {
    let headers = new HttpHeaders();
    headers = headers.set('Content-Type', 'application/json; charset=utf-8');
    this.http.get(this.apiUrl).pipe(
      catchError(error => {
        console.warn('Errore durante la richiesta:', error);
        if (error.status === 302) {
          console.warn('Reindirizzamento rilevato:', error.headers.get('Location'));
        }
        return of([]); // Restituisce un array vuoto in caso di errore
      })
    ).subscribe(data => {
      // Read the result field from the JSON response.
      this.data = data;
      console.log(this.data);
    });
  }
}