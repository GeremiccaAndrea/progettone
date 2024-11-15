import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Definisci il tipo di dato per i crimini
export interface Crime {
  id: number;
  type: string;
  date: string;
  location: string;
  // Aggiungi altri campi pertinenti qui
}

@Injectable({
  providedIn: 'root'
})
export class CrimesService {
  private apiUrl = 'https://progettone.onrender.com/gdf';

  constructor(private http: HttpClient) { }

  // Funzione per ottenere i crimini senza parametri
  getCrimes(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Errore durante il recupero dei dati GeoJSON:', error);
        throw error;
      })
    );
  }
}
