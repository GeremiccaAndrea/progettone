import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrimeReportService } from './crime-report.service';
import * as L from 'leaflet';
import { SessionService } from '../session.service';
import { Router } from '@angular/router';
import { Auth, user, User  } from '@angular/fire/auth';

@Component({
  selector: 'app-crime-report',
  templateUrl: './crime-report.component.html',
  styleUrls: ['./crime-report.component.css']
})
export class CrimeReportComponent implements OnInit {
  reportForm: FormGroup;
  map: any;
  marker: any;
  logged: boolean =false;
  utente !: User | null;

  constructor(private fb: FormBuilder, private crimeReportService: CrimeReportService,private auth: Auth, private router: Router, private session: SessionService) { 
    this.reportForm = this.fb.group({
      location: ['', Validators.required],
      crimeType: ['', Validators.required],
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {

    const token = this.session.getToken();
    if (token) {
      console.log("Utente loggato");
      this.auth.onAuthStateChanged(user => {
      if (user) {
        this.utente = user;
        this.logged = true;
        console.log(this.utente);
      } 
      });
    } else {  
        this.router.navigate(['/login']);
        return
      }

    if (this.map) {
      this.map.remove();
    }

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
      utente: this.utente,
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