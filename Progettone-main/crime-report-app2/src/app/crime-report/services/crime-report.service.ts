import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CrimeReportService {
  private apiUrl = 'https://41000-geremiccaand-progettone-aowdh9sr3ek.ws-eu118.gitpod.io/api/ins';

  constructor(private http: HttpClient) { }

  submitReport(reportData: any): Observable<any> {
    console.log('Sending data to API:', reportData); // Debug log
    
    const headers = new HttpHeaders().set('Content-Type', 'application/json');

    return this.http.post(this.apiUrl, reportData, { headers }).pipe(
      tap(response => console.log('API Response:', response)),
      catchError(error => {
        console.error('API Error:', error);
        throw error;
      })
    );
  }
}