"""
Enrico Cottone
Andrea Leone
"""

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

# Abilitare CORS per richieste da qualsiasi origine
CORS(app)

# Connessione al database MongoDB
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri, server_api=ServerApi('1'))
database = client["mappaUtenti"]
collection = database["segnalazioni"]

# Endpoint per inserire una nuova segnalazione
@app.route('/api/ins', methods=['POST'])
def ins_dati():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Nessun dato ricevuto"}), 400

    # Controllo specifico dei campi richiesti
    missing_fields = []
    if 'dove' not in data or not data['dove']:
        missing_fields.append('dove')
    if 'rating' not in data or not isinstance(data['rating'], int):
        missing_fields.append('rating')
    if 'tipo_di_crimine' not in data or not data['tipo_di_crimine']:
        missing_fields.append('tipo_di_crimine')
    if 'geometry' not in data or 'coordinates' not in data['geometry']:
        missing_fields.append('geometry.coordinates')

    if missing_fields:
        return jsonify({"error": f"Campi obbligatori mancanti o non validi: {', '.join(missing_fields)}"}), 400

    new_crime = {
        "_id": str(ObjectId()),
        "data_inserimento": datetime.now(),
        "utente": {
            "nome": "pino",
            "cognome": "gino",
            "data_nascita": "1990-01-02"
        },
        "dove": data['dove'],
        "rating": data['rating'],
        "tipo_di_crimine": data['tipo_di_crimine'],
        "descrizione": data.get('description', ""),
        "geometry": {
            "type": "Point",
            "coordinates": data['geometry']['coordinates']
        }
    }

    collection.insert_one(new_crime)

    return jsonify({
        "message": "Crime data inserted successfully",
        "id": new_crime["_id"]
    }), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=41000, debug=True)