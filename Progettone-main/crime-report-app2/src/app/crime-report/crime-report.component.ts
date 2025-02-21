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
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.map = L.map('map').setView([45.4642, 9.19], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.marker = L.marker([45.4642, 9.19]).addTo(this.map);

    this.map.on('click', (e: any) => {
      const latLng = e.latlng;
      this.marker.setLatLng(latLng);
      this.updateLocation(latLng);
    });
  }

  updateLocation(latLng: any): void {
    const lat = latLng.lat.toFixed(6);
    const lng = latLng.lng.toFixed(6);
    this.reportForm.patchValue({
      location: [lat, lng],
    });
  }

  submitReport(): void {
    if (this.reportForm.invalid) {
      alert("Compila tutti i campi correttamente.");
      return;
    }

    const reportData = {
      utente: { nome: '', cognome: '', data_nascita: '' },
      dove: this.reportForm.value.location,
      rating: parseInt(this.reportForm.value.rating),
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
        this.reportForm.reset();
      },
      (error) => {
        alert("Errore durante l'invio della segnalazione.");
        console.error(error);
      }
    );
  }
}