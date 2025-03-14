"""
Enrico Cottone
Andrea Leone
"""

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import pandas as pd
from flask_cors import CORS
from datetime import datetime
import jsonify
from flask import Flask, request, jsonify

app = Flask(__name__)
#permette di fare richieste da qualsiasi origine
CORS(app, resources={r"/api/*": {"origins": "*"}}) 

uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri, server_api=ServerApi('1'))
database = client["mappaUtenti"]
collection = database["segnalazioni"]

# registrazione dati
@app.route('/api/ins', methods=['POST'])
def ins_dati():
    # Trasformiamo i dati in json
    data = request.get_json()
    # Prendiamo i parametri
    data_inserimento = datetime.now()
    utente = data.get('utente', {})
    dove = data.get('dove')
    rating = data.get('rating')
    tipo_di_crimine = data.get('tipo_di_crimine')
    geometry = data.get('geometry', {})
    descrizione= data.get('description')
    print("Ricevuto", data_inserimento)

    # Controllo dei campi obbligatori
    if not all([utente, dove, rating, tipo_di_crimine, geometry]):
        print("Missing required fields")
        return jsonify({"error": "Missing required fields"}), 400

    new_crime = {
        "data_inserimento": data_inserimento,
        "utente": utente,
        "dove": "via roma ,Milano",
        "rating": int(rating),
        "tipo_di_crimine": str(tipo_di_crimine),
        "Descrizione": str(descrizione),
        "geometry": {
            "type": "Point",
            "coordinates": geometry.get('coordinates')
        }
    }
    
    # Inserisci il documento nel database
    collection.insert_one(new_crime)
    
    return jsonify({"message": "Crime data inserted successfully"}), 201

@app.route('/api/get_all', methods=['GET'])
def get_all_data():
    # Recupera tutti i documenti dalla collezione
    all_data = list(collection.find({}, {'_id': 0}))
    return jsonify(all_data)

@app.route('/api/<user_id>', methods=['GET'])
def get_user_posts(user_id):
    # Recupera tutti i documenti dalla collezione
    all_data = list(collection.find({"utente.uid": user_id}, {'_id': 0}))
    print(all_data)
    return jsonify(all_data)



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=41000, debug=True)