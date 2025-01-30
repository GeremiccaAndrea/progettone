export class Post {
    _id: string;
    data_inserimento: Date;
    idUtente: string;
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
        dove: string,
        rating: number,
        tipo_di_crimine: string,
        coordinates: [number, number]
    ) {
        this._id = _id;
        this.data_inserimento = data_inserimento;
        this.idUtente = idUtente;
        this.dove = dove;
        this.rating = rating;
        this.tipo_di_crimine = tipo_di_crimine;
        this.geometry = {
            type: "Point",
            coordinates: coordinates
        };
    }
}
