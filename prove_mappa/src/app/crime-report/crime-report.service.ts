import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CrimeReportService {

  // private apiUrl = 'https://41000-geremiccaand-progettone-1jckuxk25zw.ws-eu118.gitpod.io/api/ins';
  private apiUrl = 'http://127.0.0.1:41000/api/ins';

  constructor(private http: HttpClient) { }

  submitReport(reportData: any): Observable<any> {
    return this.http.post(this.apiUrl, reportData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
}