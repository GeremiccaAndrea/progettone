from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

# Simple CORS configuration
CORS(app)

# Connessione al database MongoDB
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri, server_api=ServerApi('1'))
database = client["mappaUtenti"]
collection = database["segnalazioni"]

# Verify MongoDB connection
try:
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")
except Exception as e:
    print("Failed to connect to MongoDB:", str(e))

# Endpoint per inserire una nuova segnalazione
@app.route('/api/ins', methods=['POST'])
def ins_dati():
    try:
        data = request.get_json()
        print("Received data:", data)  # Debug log

        if not data:
            return jsonify({"error": "Nessun dato ricevuto"}), 400

        # Controllo specifico dei campi richiesti
        missing_fields = []
        if 'arresto' not in data or not isinstance(data['arresto'], bool):
            missing_fields.append('arresto')
        if 'tipologia' not in data or not data['tipologia']:
            missing_fields.append('tipologia')
        if 'quartiere' not in data or not data['quartiere']:
            missing_fields.append('quartiere')
        if 'citta' not in data or not data['citta']:
            missing_fields.append('citta')

        if missing_fields:
            return jsonify({"error": f"Campi obbligatori mancanti o non validi: {', '.join(missing_fields)}"}), 400

        new_crime = {
            "_id": str(ObjectId()),
            "arresto": data['arresto'],
            "tipologia": data['tipologia'],
            "data": datetime.now(),
            "quartiere": data['quartiere'],
            "citta": data['citta']
        }

        print("Attempting to insert:", new_crime)  # Debug log
        result = collection.insert_one(new_crime)
        print("Insert result:", result.inserted_id)  # Debug log

        return jsonify({
            "message": "Crime data inserted successfully",
            "id": new_crime["_id"]
        }), 201

    except Exception as e:
        print("Error:", str(e))  # Debug log
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=41000, debug=True)