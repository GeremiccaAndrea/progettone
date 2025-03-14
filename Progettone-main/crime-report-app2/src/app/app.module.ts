import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';  // Aggiunto FormsModule
import { AppComponent } from './app.component';
import { CrimeReportComponent } from './crime-report/crime-report.component';
import { HttpClientModule } from '@angular/common/http';  // Per chiamate API

@NgModule({
  declarations: [
    AppComponent,
    CrimeReportComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,  // Import necessario per usare ngModel
    HttpClientModule  // Import necessario per le API
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
