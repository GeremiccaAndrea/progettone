import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CrimeReportService {

  private apiUrl = 'https://4200-geremiccaand-progettone-tpce9j94vps.ws-eu117.gitpod.io/api/ins';

  constructor(private http: HttpClient) { }

  submitReport(reportData: any): Observable<any> {
    return this.http.post(this.apiUrl, reportData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
}
