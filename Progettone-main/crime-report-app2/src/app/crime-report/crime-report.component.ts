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
      tipologia: ['', Validators.required],
      descrizione: ['', Validators.required],
      arresto: [false],
      rating: [1, [Validators.required, Validators.min(1), Validators.max(5)]]
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

  updateRating(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.reportForm.patchValue({ rating: parseInt(input.value, 10) });
  }

  toggleArresto(): void {
    this.arresto = !this.arresto;
    this.reportForm.patchValue({ arresto: this.arresto });
  }

  submitReport(): void {
    if (this.reportForm.invalid) {
      alert("Compila tutti i campi obbligatori!");
      return;
    }

    const reportData = {
      arresto: this.reportForm.value.arresto,
      tipologia: this.reportForm.value.tipologia,
      descrizione: this.reportForm.value.descrizione,
      quartiere: this.locationInfo.neighbourhood || "N/A",
      citta: this.locationInfo.city || "N/A",
      rating: this.reportForm.value.rating
    };

    console.log("Attempting to send data:", reportData);

    this.crimeReportService.submitReport(reportData).subscribe(
      response => {
        console.log('Success response:', response);
        alert("Segnalazione inviata con successo!");
        this.reportForm.reset();
      },
      error => {
        console.error("Error details:", error);
        if (error.error && error.error.error) {
          alert(`Errore: ${error.error.error}`);
        } else {
          alert("Si è verificato un errore. Riprova.");
        }
      }
    );
  }
}