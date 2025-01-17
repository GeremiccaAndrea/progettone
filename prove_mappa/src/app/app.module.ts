import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { CrimesService } from './crimes.service';
import { AppRoutingModule } from './app-routing.module';
import { LoginComponent } from './login/login.component';
import { MapComponent } from './map/map.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MapComponent
  ],
  imports: [
    BrowserModule, HttpClientModule, AppRoutingModule
  ],
  providers: [CrimesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
