"""
Enrico Cottone
Andrea Leone
"""

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId  # Correzione qui
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

# Abilitare CORS per richieste da qualsiasi origine
CORS(app, resources={r"/api/": {"origins": ""}}) 

# Connessione al database MongoDB
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri, server_api=ServerApi('1'))
database = client["mappaUtenti"]
collection = database["segnalazioni"]

# Endpoint per inserire una nuova segnalazione
@app.route('/api/ins', methods=['POST'])
def ins_dati():
    # Ricezione dei dati dal frontend
    data = request.get_json()
    
    # Controllo che i dati siano validi
    if not data:
        return jsonify({"error": "Nessun dato ricevuto"}), 400

    # Estrazione dei dati con valori di default
    data_inserimento = datetime.now()
    dove = data.get('dove', "")
    rating = data.get('rating', 0)
    tipo_di_crimine = data.get('tipo_di_crimine', "")
    geometry = data.get('geometry', {})
    descrizione = data.get('description', "")

    # Controllo dei campi obbligatori
    if not all([dove, rating, tipo_di_crimine, geometry]):
        return jsonify({"error": "Campi obbligatori mancanti"}), 400

    # Creazione della nuova segnalazione con ID univoco
    new_crime = {
        "_id": str(ObjectId()),  # ID univoco generato automaticamente
        "data_inserimento": data_inserimento,
        "utente": {
            "nome": "pino",
            "cognome": "gino",
            "data_nascita": "1990-01-02"
        },
        "dove": "via roma ,Milano",
        "rating": int(rating),
        "tipo_di_crimine": str(tipo_di_crimine),
        "descrizione": str(descrizione),
        "geometry": {
            "type": "Point",
            "coordinates": geometry.get('coordinates', [0, 0])
        }
    }

    # Inserimento nel database
    collection.insert_one(new_crime)

    # Restituisce il messaggio di successo con l'ID della segnalazione
    return jsonify({
        "message": "Crime data inserted successfully",
        "id": new_crime["_id"]
    }), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=41000, debug=True)
