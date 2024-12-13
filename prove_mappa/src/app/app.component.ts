import { Component, OnInit } from '@angular/core';
import { CrimesService } from './crimes.service';
import * as L from 'leaflet';  // Importa Leaflet
import { Feature, FeatureCollection } from 'geojson';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  geojsonData:any; // Dati GeoJSON che contengono sia la geometria che il numero di crimini
  geojsonDataMilano:any; 
  crimini: any;
  formattedData: any;

  constructor(private crimesService: CrimesService, private router: Router) { }

  map!: L.Map;

  ngOnInit(): void {
    this.initMap();
    this.loadData(); // Carica il file GeoJSON
  }

  // Funzione per inizializzare la mappa
  initMap(): void {
    this.map = L.map('map', {
      // center: [41.816813771373916, -87.60670812560372],  // Coordinate centrali per Chicago
      center:[45.4642, 9.19],
      zoom: 14
    });

    // Aggiungi il layer di base di OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }
  flyToLocation(lat: number, lng: number): void {
    this.map.flyTo([lat, lng], 14); // Cambia lo zoom se necessario
  }
  searchLocation(query: string): void {
    this.crimesService.search(query).subscribe(
      location => {
        if (location) {
          console.log(location); // Controlla i dati ricevuti
          const lat = parseFloat(location.lat);
          const lon = parseFloat(location.lon);
          this.flyToLocation(lat, lon);
        } else {
          alert('Nessun risultato trovato!');
        }
      },
      error => {
        console.error('Errore durante la ricerca:', error);
        alert('Si è verificato un errore durante la ricerca.');
      }
    );
  }

  onSwitchChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      console.log('chicago e milano');
    } else {
      console.log('mappa utenti');
    }
  }
  
  // Funzione per caricare i dati (crimini e distretti) da un file GeoJSON
  loadData(): void {
    this.crimesService.getCrimes().subscribe(
      (data) => {
        console.log(data);
        // Assicurati che data sia un FeatureCollection
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          this.geojsonData = data;
          this.addDistrictsToMap(data);
        } else {
          console.error("Formato GeoJSON non valido", data);
        }
      },
      (error) => {
        console.error('Errore nel recupero dei dati:', error);
      }
    );
    this.crimesService.getMilano().subscribe(
      (data) => {
        console.log("Milano",data);
        // Assicurati che data sia un FeatureCollection
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          this.geojsonDataMilano = data;
          this.addDistrictsToMap(this.geojsonDataMilano);
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
  getCrimeColor(crimeCount: number,data: any): string {
    console.log("inserimento colore");
    
    const maxCrimeCount = Math.max(...data.features.map((f: any) => f.properties.crime_count)); 
    
    const verde=maxCrimeCount*0.25;
    const giallo=maxCrimeCount*0.75;
    
    let r = 0, g = 0, b = 0;

    if (crimeCount <= verde) {
      // Colori dalla verde (basso) al giallo (medio)
      
      return `rgb(0,255,0)`;
    } else if(crimeCount <= giallo){
      // Colori dal giallo al rosso (alto)
      return `rgb(255,255,0)`;
    }else{
      return `rgb(255,0,0)`;
    }

    
  }

  // Funzione per aggiungere i distretti con il numero di crimini alla mappa
  addDistrictsToMap(data: any): void {
    L.geoJSON(data, {
      style: (feature: any) => {
        const crimeCount = feature.properties?.crime_count || 0;
        const color = this.getCrimeColor(crimeCount,data); // Otteniamo il colore in base al numero di crimini
        
        return {
          color: color,   // Border color
          weight: 1,       // Border thickness
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
        layer.on('click',()=>{
          console.log(neighborhood);
          this.crimesService.getCriminiByNeigh(neighborhood).subscribe(data => {
            console.log(data); // Mostra i dati recuperati nella console
            this.crimini = data; // Salva i dati dei crimini del quartiere cliccato 
            // Trasforma i dati in un array di oggetti
            const keys = Object.keys(this.crimini.id); // Usa una delle proprietà principali per le chiavi (ad esempio "id")
            this.formattedData = keys.map(key => ({
              id: this.crimini.id[key],
              arrest: this.crimini.arrest[key],
              case_number: this.crimini.case_number[key],
              date: this.crimini.date[key],
              description: this.crimini.description[key],
              domestic: this.crimini.domestic[key],
            }));

            console.log(this.formattedData);
          });
        });
      }
    }).addTo(this.map); // Aggiungi il layer alla mappa
  }
}