import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CrimeReportService {

  private apiUrl = 'https://41000-andrealeone0-progettone-ayl7qrlakgi.ws-eu117.gitpod.io/api/ins'; // Sostituisci con l'URL della tua API

  constructor(private http: HttpClient) { }

  // Metodo per inviare una segnalazione al server
  submitReport(reportData: any): Observable<any> {
    return this.http.post(this.apiUrl, reportData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
}