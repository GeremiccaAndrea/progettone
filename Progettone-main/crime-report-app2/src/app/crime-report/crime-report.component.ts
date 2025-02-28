import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  constructor(private fb: FormBuilder, private crimeReportService: CrimeReportService) {
    this.reportForm = this.fb.group({
      location: ['', Validators.required],
      crimeType: ['', Validators.required],
      rating: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
      description: ['', Validators.required]
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

    // Imposta il cursore personalizzato per la mappa
    this.map.getContainer().style.cursor = 'url(https://upload.wikimedia.org/wikipedia/commons/2/29/Crosshair.svg) 16 16, crosshair';

    this.map.on('click', (e: any) => {
      const latLng = e.latlng;
      this.marker.setLatLng(latLng);
      this.updateLocation(latLng);
    });
  }

  updateLocation(latLng: any): void {
    const lat = latLng.lat.toFixed(6);
    const lng = latLng.lng.toFixed(6);
    this.reportForm.patchValue({ location: [lat, lng] });
  }

  updateRating(event: any): void {
    this.reportForm.patchValue({ rating: event.target.value });
  }

  submitReport(): void {
    if (this.reportForm.invalid) {
      alert("Compila tutti i campi correttamente.");
      return;
    }

    const reportData = {
      utente: { nome: 'Nome', cognome: 'Cognome', data_nascita: '2000-01-01' },
      dove: this.reportForm.value.location,
      rating: parseInt(this.reportForm.value.rating, 10),
      tipo_di_crimine: this.reportForm.value.crimeType,
      geometry: {
        type: 'Point',
        coordinates: [
          parseFloat(this.marker.getLatLng().lat.toFixed(6)),
          parseFloat(this.marker.getLatLng().lng.toFixed(6))
        ]
      },
      description: this.reportForm.value.description
    };

    this.crimeReportService.submitReport(reportData).subscribe(
      (response) => {
        alert("Segnalazione inviata con successo! ID: " + response.id);
        this.reportForm.reset({ rating: 1 });
      },
      (error) => {
        alert("Errore durante l'invio della segnalazione.");
        console.error(error);
      }
    );
  }
}