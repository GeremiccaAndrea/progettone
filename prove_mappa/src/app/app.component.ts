import { Component, OnInit } from '@angular/core';
import { CrimesService } from './crimes.service';
import * as L from 'leaflet';  // Importa Leaflet

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  geojsonData:any; // Dati GeoJSON che contengono sia la geometria che il numero di crimini

  constructor(private crimesService: CrimesService) { }

  map!: L.Map;

  ngOnInit(): void {
    this.initMap();
    this.loadData(); // Carica il file GeoJSON
  }

  // Funzione per inizializzare la mappa
  initMap(): void {
    this.map = L.map('map', {
      center: [41.816813771373916, -87.60670812560372],  // Coordinate centrali per Chicago
      zoom: 14
    });

    // Aggiungi il layer di base di OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  // Funzione per caricare i dati (crimini e distretti) da un file GeoJSON
  loadData(): void {
    this.crimesService.getCrimes().subscribe(
      (data) => {
        // Assicurati che data sia un FeatureCollection
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          this.geojsonData = data;
          this.addDistrictsToMap(this.geojsonData);
        } else {
          console.error("Formato GeoJSON non valido", data);
        }
      },
      (error) => {
        console.error('Errore nel recupero dei dati:', error);
      }
    );
  }
  // Funzione per determinare il colore in base al numero di crimini
  getCrimeColor(crimeCount: number): string {
    const maxCrimeCount = 62;  // Numero massimo di crimini per la scala dei colori
    const minCrimeCount = 0;   // Numero minimo di crimini
    const midCrimeCount = (maxCrimeCount - minCrimeCount) / 2;  // Punto medio

    let r = 0, g = 0, b = 0;

    if (crimeCount <= midCrimeCount) {
      // Colori dalla verde (basso) al giallo (medio)
      const greenToYellowRatio = crimeCount / midCrimeCount;
      g = Math.floor(255 * (1 - greenToYellowRatio)); // Decresce il verde
      r = Math.floor(255 * greenToYellowRatio);      // Aumenta il rosso
      b = 0;
    } else {
      // Colori dal giallo al rosso (alto)
      const yellowToRedRatio = (crimeCount - midCrimeCount) / (maxCrimeCount - midCrimeCount);
      r = Math.floor(255 * yellowToRedRatio);  // Aumenta il rosso
      g = Math.floor(255 * (1 - yellowToRedRatio));  // Diminuisce il verde
      b = 0;
    }

    return `rgb(${r},${g},${b})`;
  }

  // Funzione per aggiungere i distretti con il numero di crimini alla mappa
  addDistrictsToMap(data: any): void {
    L.geoJSON(data, {
      style: (feature: any) => {
        const crimeCount = feature.properties?.crime_count || 0;
        const color = this.getCrimeColor(crimeCount); // Otteniamo il colore in base al numero di crimini
        
        return {
          color: color,   // Border color
          weight: 2,       // Border thickness
          opacity: 1       // Border opacity
        };
      },
      onEachFeature: (feature, layer) => {
        // Check for the required properties to avoid undefined errors
        const neighborhood = feature.properties?.pri_neigh || "Unknown";
        const crimeCount = feature.properties?.crime_count || 0;
        layer.bindPopup(`
          <strong>${neighborhood}</strong><br/>
          Crimini: ${crimeCount}`);
      }
    }).addTo(this.map); // Aggiungi il layer alla mappa
  }
}
