import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CrimeReportService } from './services/crime-report.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-crime-report',
  templateUrl: './crime-report.component.html',
  styleUrls: ['./crime-report.component.css']
})
export class CrimeReportComponent implements OnInit {
  reportForm: FormGroup;
  map: any;
  marker: any;
  searchQuery: string = '';  
  locationInfo: any = null;  
  arresto: boolean = false;  

  constructor(private fb: FormBuilder, private http: HttpClient, private crimeReportService: CrimeReportService) {
    this.reportForm = this.fb.group({
      location: ['', Validators.required],
      tipologia: ['', Validators.required],  // Modificato da crimeType a tipologia
      description: ['', Validators.required],
      arresto: [false] 
    });
  }

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([45.4642, 9.19], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowSize: [41, 41]
    });

    this.marker = L.marker([45.4642, 9.19], { icon: customIcon, interactive: false }).addTo(this.map);

    this.map.on('click', (e: any) => {
      const latLng = e.latlng;
      this.marker.setLatLng(latLng);
      this.updateLocation(latLng);
      this.reverseGeocode(latLng.lat, latLng.lng);
    });
  }

  updateLocation(latLng: any): void {
    const lat = latLng.lat.toFixed(6);
    const lng = latLng.lng.toFixed(6);
    this.reportForm.patchValue({ location: [lat, lng] });
  }

  reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    this.http.get(url).subscribe((data: any) => {
      this.locationInfo = {
        road: data.address?.road || 'N/A',
        city: data.address?.city || data.address?.town || data.address?.village || 'N/A',
        neighbourhood: data.address?.neighbourhood || data.address?.suburb || 'N/A'
      };
    }, error => {
      console.error("Errore nella geocodifica inversa:", error);
      this.locationInfo = null;
    });
  }

  searchLocation(): void {
    if (!this.searchQuery) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;
    
    this.http.get(url).subscribe((results: any) => {
      if (results.length > 0) {
        const result = results[0];  
        const latLng = L.latLng(result.lat, result.lon);
        
        this.map.setView(latLng, 13);
        this.marker.setLatLng(latLng);
        this.updateLocation(latLng);
        this.reverseGeocode(result.lat, result.lon);
      } else {
        alert("Nessun risultato trovato.");
      }
    }, error => {
      console.error("Errore nella ricerca dell'indirizzo:", error);
    });
  }

  toggleArresto(): void {
    this.arresto = !this.arresto;
    this.reportForm.patchValue({ arresto: this.arresto });
  }

  submitReport(): void {
    if (this.reportForm.invalid || !this.locationInfo) {
      alert("Compila tutti i campi obbligatori!");
      return;
    }

    // Costruisco i dati della segnalazione con i valori corretti
    const reportData = {
      arresto: this.reportForm.value.arresto,
      tipologia: this.reportForm.value.tipologia,
      quartiere: this.locationInfo.neighbourhood || "N/A",
      citta: this.locationInfo.city || "N/A"
    };

    console.log("Segnalazione inviata:", reportData);

    this.crimeReportService.submitReport(reportData).subscribe(response => {
      alert("Segnalazione inviata con successo!");
      this.reportForm.reset();
    }, error => {
      console.error("Errore durante l'invio della segnalazione:", error);
      alert("Si è verificato un errore. Riprova.");
    });
  }
}
