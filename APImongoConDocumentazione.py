import pandas as pd
from flask import Flask, jsonify, request
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import pandas as pd
from flask_cors import CORS
app = Flask(__name__)
#permette di fare richieste da qualsiasi origine
CORS(app, resources={r"/api/*": {"origins": "*"}}) 
#connect to DB
uri = "mongodb+srv://classeIntera:UFltAmk9TEVZtmJN@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))
#chose the db
database = client["mappaUtenti"]
#chose the collection
users = database["segnalazioni"]


#127.0.0.1:5000/api/utenti
def serialize_document(doc):
    """Converte gli ObjectId in stringhe per tutti i documenti MongoDB."""
    if doc:
        doc['_id'] = str(doc['_id'])  # Converti l'ObjectId in stringa
    return doc

# registrazione
@app.route('/api/reg', methods=['POST'])
def add_utente():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 409
     # Crea il nuovo utente
    new_user = {
        "name": username,
        "password": password,
        "email": email
    }
    # Inserisci il nuovo utente nel database
    users.insert_one(new_user)
    
    return jsonify({"message": "User created successfully"}), 201

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=5000, debug=True)