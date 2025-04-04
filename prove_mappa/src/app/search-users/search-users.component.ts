import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { SessionService } from '../session.service';
import { Auth } from '@angular/fire/auth';
@Component({
  selector: 'app-search-users',
  templateUrl: './search-users.component.html',
  styleUrls: ['./search-users.component.css']
})

export class SearchUsersComponent implements OnInit {
  routeObs !: Observable<ParamMap>; 
  results: any;
  token = this.session.getToken();
  constructor(private http: HttpClient,  private route: ActivatedRoute, private router: Router, private session : SessionService, private auth: Auth) {}

  ngOnInit() {
    this.routeObs = this.route.paramMap;
    this.routeObs.subscribe(this.getRouterParam);
  }
  getRouterParam = (params: ParamMap) =>
    {
      let searchedUser = params.get('searchedUser') || ''; 
      const apiUrl =`http://localhost:41000/api/sarch_users/${searchedUser}`;
      console.log(searchedUser);
      this.http.get(apiUrl).subscribe(data => {
        // Read the result field from the JSON response.
        this.results = data;
        console.log(this.results);
      });

    } 
    goUser(uid: string) {
      if (this.token) {
        this.auth.onAuthStateChanged(logged => {
        if (logged?.uid == uid) {
          this.router.navigate(['profile']);
          return;
        } 
        });
      }
      this.router.navigate(['user', uid]);
    }
}