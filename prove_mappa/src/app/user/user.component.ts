import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Post } from '../post.model';
import { Auth } from '@angular/fire/auth';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent {
  routeObs !: Observable<ParamMap>; 
  results: any;
  user: any;
  user_uid !: string;
  loaded: boolean = false;
  posts: Post[] = [];
  
  constructor(private http: HttpClient,   private route: ActivatedRoute, private session: SessionService,private router: Router, private auth: Auth) {}

  ngOnInit() {
    this.loaded = true;
    this.routeObs = this.route.paramMap;
    this.routeObs.subscribe(this.getRouterParam);
  }
  
  //#region GET USER
  getRouterParam = (params: ParamMap) =>
    {
      this.user_uid = params.get('uid') || ''; 
      const apiUrl = `http://127.0.0.1:41000/api/getuser/${this.user_uid }`;
      this.http.get(apiUrl).pipe(
        catchError(error => {
          console.warn('Errore durante la richiesta:', error);
          if (error.status === 302) {
            console.warn('Reindirizzamento rilevato:', error.headers.get('Location'));
          }
          return of([]); // Restituisce un array vuoto in caso di errore
        })
      ).subscribe(data => {
        // Read the result field from the JSON response.
        this.user = data;
        this.chiamata_db();
      });
    }
    //#endregion 

    //#region GET POSTS
    chiamata_db() {
      let apiUrl: string = 'http://127.0.0.1:41000/api/get_user_posts/' + this.user?.uid;
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
      });
    }
    //#endregion
}
