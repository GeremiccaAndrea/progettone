import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  // Chiave utilizzata per salvare il token in localStorage
  private readonly TOKEN_KEY = 'authToken';

  constructor() {}

  /**
   * Salva il token di autenticazione nella sessione.
   * @param token La stringa del token da salvare.
   */
  public setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Recupera il token di autenticazione dalla sessione.
   * @returns Il token salvato oppure null se non presente.
   */
  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Verifica se l'utente è loggato controllando la presenza del token.
   * @returns True se il token esiste, altrimenti false.
   */
  public isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Cancella la sessione rimuovendo il token.
   */
  public clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}