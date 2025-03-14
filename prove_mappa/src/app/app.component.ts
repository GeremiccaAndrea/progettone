import { Component, OnInit,HostListener } from '@angular/core';
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
  //menu, apritiSesamo
isDropdownOpen: boolean = false;

toggleDropdown(event: Event): void {
    event.stopPropagation(); // Evita la chiusura immediata
    this.isDropdownOpen = !this.isDropdownOpen;
}

@HostListener('document:click', ['$event'])
closeDropdown(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
        this.isDropdownOpen = false;
    }
}


  //parte inizialw del progetto di magia
  startSearch(query: string): void {
    if (query) {
      const buttonContainer = document.getElementById("button-container");

      // Nascondi input e bottone quando la ricerca è avviata
      if (buttonContainer) {
        buttonContainer.style.display = "none";  // Nascondi la zona del bottone
      }

      // Riattiva lo scroll una volta che la ricerca è avviata
      document.body.style.overflow = "auto";
    }
  }

  ngAfterViewInit(): void {
    const userInput = document.getElementById("userInput");
    if (userInput) {
      userInput.addEventListener("keypress", (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          userInput.classList.add("fade-out");
          const helperText = document.getElementById("helperText");
          if (helperText) {
            helperText.classList.add("fade-out");
          }
  
          setTimeout(() => {
            const initialContainer = document.getElementById("initialContainer");
            if (initialContainer) {
              initialContainer.style.display = "none";
            }
            const mainContent = document.getElementById("mainContent");
            if (mainContent) {
              mainContent.style.opacity = "1";
            }
          }, 5000);
        }
      });
    }}
  geojsonData:any; // Dati GeoJSON che contengono sia la geometria che il numero di crimini
  geojsonDataMilano:any; 
  crimini: any;
  formattedData: any;
  geoJsonLayer:any;

  constructor(private crimesService: CrimesService, private router: Router) { }

  map!: L.Map;

  ngOnInit(): void {
    this.initMap(); // Carica il file GeoJSON
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
    if (this.geoJsonLayer!= null){
      this.geoJsonLayer.remove();
    }
    this.crimesService.search(query).subscribe(
      location => {
        if (location) {
          console.log(location.name); // Controlla i dati ricevuti
          this.loadData(location.name)
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
  loadData(namecity:string): void {
    console.log(namecity);
    this.crimesService.GetCity(namecity).subscribe(
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
  }
  // Funzione per determinare il colore in base al numero di crimini
  getCrimeColor(crimeCount: number,data: any): string {
    console.log("inserimento colore");
    const maxCrimeCount = Math.max(...data.features.map((f: any) => f.properties.numero_crimini)); 
    const verde=maxCrimeCount*0.25;
    const giallo=maxCrimeCount*0.75;
    let r = 0, g = 0, b = 0;
    if (crimeCount <= verde) {      
      return `rgb(0,255,0)`;
    } else if(crimeCount <= giallo){
      return `rgb(255,255,0)`;
    }else{
      return `rgb(255,0,0)`;
    }
  }
  // Funzione per aggiungere i distretti con il numero di crimini alla mappa
  addDistrictsToMap(data: any): void {
  
    this.geoJsonLayer = L.geoJSON(data, {
      style: (feature: any) => {
        const crimeCount = feature.properties?.numero_crimini || 0;
        const color = this.getCrimeColor(crimeCount,data); // Otteniamo il colore in base al numero di crimini
        
        return {
          color: color,   // Border color
          weight: 1,       // Border thickness
          opacity: 1       // Border opacity
        };
      },
      onEachFeature: (feature, layer) => {
        // Check for the required properties to avoid undefined errors
        const neighborhood = feature.properties?.quartiere || "Unknown";
        const crimeCount = feature.properties?.numero_crimini || 0;
        layer.bindPopup(`
          <strong>${neighborhood}</strong><br/>
          Crimini: ${crimeCount}`);
      }
    }).addTo(this.map); // Aggiungi il layer alla mappa


  }
}