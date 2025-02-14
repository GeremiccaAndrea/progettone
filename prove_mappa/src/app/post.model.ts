export class Post {
    _id: string;
    data_inserimento: Date;
    utente: {
        id: string;
        nome: string;
        cognome: string;
        email: string;
    };
    descrizione: string;
    dove: string;
    rating: number;
    tipo_di_crimine: string;
    geometry: {
        type: string;
        coordinates: [number, number];
    };

    constructor(
        _id: string,
        data_inserimento: Date,
        idUtente: string,
        nomeUtente : string,
        cognomeUtente: string,
        emailUtente: string,
        descrizione: string,
        dove: string,
        rating: number,
        tipo_di_crimine: string,
        coordinates: [number, number]
    ) {
        this._id = _id;
        this.data_inserimento = data_inserimento;
        this.utente=  {
            id: idUtente,
            nome: nomeUtente,
            cognome: cognomeUtente,
            email: emailUtente
        };
        this.descrizione = descrizione;
        this.dove = dove;
        this.rating = rating;
        this.tipo_di_crimine = tipo_di_crimine;
        this.geometry = {
            type: "Point",
            coordinates: coordinates
        };
    }
}
