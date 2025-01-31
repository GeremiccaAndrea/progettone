import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrimeReportService } from './services/crime-report.service';  // Assicurati che il percorso del servizio sia corretto
import * as L from 'leaflet'; // Per usare Leaflet, se lo stai utilizzando

@Component({
  selector: 'app-crime-report',
  templateUrl: './crime-report.component.html',
  styleUrls: ['./crime-report.component.css']
})
export class CrimeReportComponent implements OnInit {
  reportForm: FormGroup;
  rating = 0;
  map: any;
  marker: any;

  constructor(private fb: FormBuilder, private crimeReportService: CrimeReportService) {
    this.reportForm = this.fb.group({
      location: ['', Validators.required],
      crimeType: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Inizializza la mappa
    this.map = L.map('map').setView([45.4642, 9.19], 13); // Milano come esempio

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    // Aggiungi un marker per la posizione
    this.marker = L.marker([45.4642, 9.19]).addTo(this.map);

    // Quando si clicca sulla mappa, sposta il marker e aggiorna la posizione
    this.map.on('click', (e: any) => {
      const latLng = e.latlng;
      this.marker.setLatLng(latLng);
      
      // Usa un servizio di geocoding per ottenere un indirizzo
      this.updateLocation(latLng);
    });
  }

  // Funzione per ottenere l'indirizzo dalla latitudine e longitudine
  updateLocation(latLng: any): void {
    // Supponiamo che tu abbia una funzione di geocoding che converte le coordinate in un indirizzo
    // Se usi Leaflet, puoi usare un plugin come 'leaflet-geocoder' o un servizio come Nominatim (OpenStreetMap)
    const lat = latLng.lat.toFixed(6);
    const lng = latLng.lng.toFixed(6);

    // Qui puoi usare un geocoding per ottenere l'indirizzo
    // Per ora, mettiamo semplicemente lat/lng come esempio
    this.reportForm.patchValue({
      location: `${lat}, ${lng}` // Modifica se desideri un formato di indirizzo
    });
  }

  setRating(star: number): void {
    this.rating = star;
  }

  submitReport(): void {
    if (this.reportForm.invalid) {
      console.error('Modulo non valido!');
      return;
    }

    const reportData = {
      utente: { nome: '', cognome: '', data_nascita: '' }, // Lasciamo vuoti i dati dell'utente
      dove: this.reportForm.value.location, // Posizione
      rating: this.rating,
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
    
    console.log('Dati della segnalazione:', reportData); // Verifica i dati prima dell'invio

    this.crimeReportService.submitReport(reportData).subscribe(
      (response) => {
        console.log('Segnalazione inviata con successo:', response);
        // Puoi aggiungere una notifica di successo qui
      },
      (error) => {
        console.error('Errore durante l\'invio della segnalazione:', error);
        // Puoi aggiungere una notifica di errore qui
      }
    );
  }
}