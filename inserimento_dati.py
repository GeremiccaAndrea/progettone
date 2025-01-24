"""
Enrico Cottone
Andrea Leone
Simone Finessi
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

uri = "mongodb+srv://classeIntera:UFltAmk9TEVZtmJN@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri, server_api=ServerApi('1'))
database = client["mappaUtenti"]
collection = database["segnalazioni"]

# registrazione dati
@app.route('/api/ins', methods=['POST'])
def ins_dati():
    data = request.get_json()
    
    data_inserimento = datetime.now()
    utente = data.get('utente', {})
    dove = data.get('dove')
    rating = data.get('rating')
    tipo_di_crimine = data.get('tipo_di_crimine')
    geometry = data.get('geometry', {})
    
    # Controllo dei campi obbligatori
    if not all([utente, dove, rating, tipo_di_crimine, geometry]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Verifica la struttura
    if not all(key in utente for key in ['id', 'nome', 'cognome', 'data_nascita']):
        return jsonify({"error": "Invalid user structure"}), 400
    
    if collection.find_one({"utente.id": utente['id']}):
        return jsonify({"error": "User ID already exists"}), 409
    
    new_crime = {
        "data_inserimento": data_inserimento,
        "utente": {
            "nome": utente['nome'],
            "cognome": utente['cognome'],
            "data_nascita": utente['data_nascita']
        },
        "dove": dove,
        "rating": rating,
        "tipo_di_crimine": tipo_di_crimine,
        "geometry": {
            "type": "Point",
            "coordinates": geometry.get('coordinates')
        }
    }
    
    # Inserisci il documento nel database
    collection.insert_one(new_crime)
    
    return jsonify({"message": "Crime data inserted successfully"}), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)