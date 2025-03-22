import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent {
  routeObs !: Observable<ParamMap>; 
  results: any;
  user: any;
  constructor(private http: HttpClient,   private route: ActivatedRoute) {}

  ngOnInit() {
    this.routeObs = this.route.paramMap;
    this.routeObs.subscribe(this.getRouterParam);
  }


  getRouterParam = (params: ParamMap) =>
    {
      let user_uid = params.get('uid') || ''; 
      const apiUrl = `http://127.0.0.1:41000/api/getuser/${user_uid}`;
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
        console.log(this.user);
      });
    }

}
