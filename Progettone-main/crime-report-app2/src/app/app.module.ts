import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { CrimeReportComponent } from './crime-report/crime-report.component';  // Importa il componente
import { ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule per il form
import { HttpClientModule } from '@angular/common/http';  // Importa HttpClientModule per fare richieste HTTP

@NgModule({
  declarations: [
    AppComponent,
    CrimeReportComponent  // Aggiungi il componente al modulo
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,  // Aggiungi ReactiveFormsModule
    HttpClientModule      // Aggiungi HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
