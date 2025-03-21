import { Component, OnInit } from '@angular/core';
import { CrimesService } from './crimes.service';
import * as L from 'leaflet';
import { Feature, FeatureCollection } from 'geojson';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  geojsonData: any;
  crimini: any;
  formattedData: any;
  geoJsonLayer: any;
  isUserMap: boolean = false; // Flag per modalità utenti

  constructor(private crimesService: CrimesService, private router: Router) { }

  map!: L.Map;

  ngOnInit(): void {
    this.initMap();
  }

  initMap(): void {
    this.map = L.map('map', {
      center: [41.816813771373916, -87.60670812560372],
      zoom: 14
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  flyToLocation(lat: number, lng: number): void {
    this.map.flyTo([lat, lng], 14);
  }

  searchLocation(query: string): void {
    if (this.geoJsonLayer != null) {
      this.geoJsonLayer.remove();
    }

    this.crimesService.search(query).subscribe(
      location => {
        if (location) {
          console.log(location.name);
          this.loadData(location.name); // Chiamata aggiornata
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
    this.isUserMap = (event.target as HTMLInputElement).checked;

    console.log(this.isUserMap ? 'Modalità utenti attiva' : 'Modalità crimini ufficiali');

    // Se sono già caricati dati per una città, ricarica i dati corretti in base allo switch
    if (this.geojsonData?.features?.length > 0 && this.geojsonData.features[0].properties?.citta) {
      const city = this.geojsonData.features[0].properties.citta;
      this.loadData(city);
    }
  }

  loadData(nameCity: string): void {
    console.log(`Caricamento dati per: ${nameCity} (modalità ${this.isUserMap ? 'utenti' : 'ufficiale'})`);

    if (this.geoJsonLayer != null) {
      this.geoJsonLayer.remove();
    }

    const dataObservable = this.isUserMap
      ? this.crimesService.getCityUser(nameCity)
      : this.crimesService.GetCity(nameCity);

    dataObservable.subscribe(
      (data) => {
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

  getCrimeColor(crimeCount: number, data: any): string {
    const maxCrimeCount = Math.max(...data.features.map((f: any) => f.properties.numero_crimini));
    const verde = maxCrimeCount * 0.25;
    const giallo = maxCrimeCount * 0.75;

    if (crimeCount <= verde) {
      return 'rgb(0,255,0)';
    } else if (crimeCount <= giallo) {
      return 'rgb(255,255,0)';
    } else {
      return 'rgb(255,0,0)';
    }
  }

  addDistrictsToMap(data: any): void {
    this.geoJsonLayer = L.geoJSON(data, {
      style: (feature: any) => {
        const crimeCount = feature.properties?.numero_crimini || 0;
        const color = this.getCrimeColor(crimeCount, data);

        return {
          color: color,
          weight: 1,
          opacity: 1
        };
      },
      onEachFeature: (feature, layer) => {
        const neighborhood = feature.properties?.quartiere || "Unknown";
        const crimeCount = feature.properties?.numero_crimini || 0;
        const city = feature.properties?.citta || "Unknown";

        layer.bindPopup(`
          <strong>${neighborhood}</strong><br/>
          Crimini: ${crimeCount}
        `);

        layer.on('click', () => {
          if (this.isUserMap) {
            this.crimesService.getSegnalazioni(city, neighborhood).subscribe(data => {
              console.log('Segnalazioni utenti:', data);
              this.crimini = data;
            });
          } else {
            this.crimesService.getDataCrime(city, neighborhood).subscribe(data => {
              console.log('Crimini ufficiali:', data);
              this.crimini = data;
            });
          }
        });
      }
    }).addTo(this.map);
  }
}
