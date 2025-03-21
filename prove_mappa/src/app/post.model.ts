export class Post {
    _id: string;
    arresto: boolean;
    tipologia: string;
    data: Date;
    quartiere: string;
    citta: string;
    descrizione: string;
    utente: any;
    geometry: {
        type: string;
        coordinates: [number, number];
    };

    constructor(
        _id: string,
        arresto: boolean,
        tipologia: string,
        data: Date,
        quartiere: string,
        citta: string,
        descrizione: string,
        utente: any,
        coordinates: [number, number]
    ) {
        this._id = _id;
        this.arresto = arresto;
        this.tipologia = tipologia;
        this.data = data;
        this.quartiere = quartiere;
        this.citta = citta;
        this.descrizione = descrizione;
        this.utente = utente;
        this.geometry = {
            type: "Point",
            coordinates: coordinates
        };
    }
}