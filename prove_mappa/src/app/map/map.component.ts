import { Component, OnInit, ViewChild, ɵsetAlternateWeakRefImpl } from '@angular/core';
import { CrimesService } from '../crimes.service';
import * as L from 'leaflet';  // Importa Leaflet
import { Feature, FeatureCollection } from 'geojson';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { Post } from '../post.model';
import { ParamMap, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  geojsonData: any;
  geoJsonLayer: any;
  crimini: any;
  formattedData: any;
  mappaUtenti: boolean = true;
  mappaReati: boolean = false;
  mappaType: boolean = this.mappaReati;
  apiUrl: string = 'http://127.0.0.1:41000/api/get_all';
  posts: Post[] = [];


  constructor(private crimesService: CrimesService, private router: Router, private route: ActivatedRoute ,private http: HttpClient) { }
  map!: L.Map;
  results: any;
  routeObs !: Observable<ParamMap>; 

  ngOnInit(): void {
    this.routeObs = this.route.paramMap;
    this.routeObs.subscribe(this.getRouterParam);
    this.initMap();
    this.chiamata_db();
  }

  getRouterParam = (params: ParamMap) =>
    {
      console.log('dai')
      let searchedLocation = params.get('searchedLocation') || '';
      console.log(searchedLocation);
      if(searchedLocation != ''){
        this.searchLocation(searchedLocation);
      }
    } 

  // Funzione per inizializzare la mappa
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
    this.map.flyTo([lat, lng], 14); // Cambia lo zoom se necessario
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
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.mappaType = this.mappaUtenti;
    } else {
      this.mappaType = this.mappaReati;
    }
    // Se sono già caricati dati per una città, ricarica i dati corretti in base allo switch
    if (this.geojsonData?.features?.length > 0 && this.geojsonData.features[0].properties?.citta) {
      const city = this.geojsonData.features[0].properties.citta;
      this.loadData(city);
    }
  }
  
  // Funzione per caricare i dati (crimini e distretti) da un file GeoJSON
  loadData(nameCity: string): void {
    console.log(`Caricamento dati per: ${nameCity} (modalità ${this.mappaType ? 'utenti' : 'ufficiale'})`);

    if (this.geoJsonLayer != null) {
      this.geoJsonLayer.remove();
    }

    const dataObservable = this.mappaType
      ? this.crimesService.getCityUser(nameCity)
      : this.crimesService.GetCity(nameCity);

    dataObservable.subscribe(
      (data: { type: string; features: any; }) => {
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          this.geojsonData = data;
          this.addDistrictsToMap(data);
        } else {
          console.error("Formato GeoJSON non valido", data);
        }
      },
      (error: any) => {
        console.error('Errore nel recupero dei dati:', error);
      }
    );
  }

  // Funzione per determinare il colore in base al numero di crimini
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

  // Funzione per aggiungere i distretti con il numero di crimini alla mappa
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
          if (this.mappaType) {
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

  chiamata_db() {
    let headers = new HttpHeaders();
    headers = headers.set('Content-Type', 'application/json; charset=utf-8');
    this.http.get<Post[]>(this.apiUrl).pipe(
      catchError(error => {
        console.warn('Errore durante la richiesta:', error);
        if (error.status === 302) {
          console.warn('Reindirizzamento rilevato:', error.headers.get('Location'));
        }
        return of([]); // Restituisce un array vuoto in caso di errore
      })
    ).subscribe(data => {
      // Read the result field from the JSON response.
      this.posts = data;
      console.log(this.posts);
    });
  }

  onModalShown(): void {
    // Inizializza la mappa nel componente app-crime-report
    
  }

  toReport(): void {
    this.router.navigate(['report']);
  }
}