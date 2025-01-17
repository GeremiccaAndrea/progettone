import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { map } from 'rxjs/operators';

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
  private apiUrl = 'https://progettone.onrender.com';
  constructor(private http: HttpClient) { }

  // Funzione per ottenere i crimini senza parametri
  
   // Metodo per fare la richiesta GET per un quartiere specifico
   GetCity(CityName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/GetCity/${CityName}`);
  }
  search(query: string): Observable<NominatimResult | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    return this.http.get<NominatimResult[]>(url).pipe(
      map(results => (results && results.length > 0 ? results[0] : null))
    );
  }

  
  
}
export interface NominatimResult {
  lat: string; // Latitude in string format
  lon: string; // Longitude in string format
  display_name: string; // Full name of the location
  name:string;
}

