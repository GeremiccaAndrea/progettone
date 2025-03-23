from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from firebase_admin import auth, credentials
import firebase_admin

# Initialize the Firebase Admin SDK
cred = credentials.Certificate("./firebaseCredentials.json")
firebase_admin.initialize_app(cred)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200"}})

# Connessione al database MongoDB
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri, server_api=ServerApi('1'))
database = client["mappaUtenti"]
collection = database["segnalazioni"]

# Recupera tutti gli utenti da Firebase
allusers = []
for user in auth.list_users().iterate_all():
    allusers.append({
        "uid": user.uid,
        "email": user.email,
        "phoneNumber": user.phone_number,
        "displayName": user.display_name,
        "photoURL": user.photo_url,
        "emailVerified": user.email_verified,
        "disabled": user.disabled,
        "metadata": {
            "creationTime": user.user_metadata.creation_timestamp,
            "lastSignInTime": user.user_metadata.last_sign_in_timestamp
        }
    })


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
        utente = data.get('utente', {})
        print("Received user data:", utente)  # Debug log
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
        if 'descrizione' not in data or not data['descrizione']:
            missing_fields.append('descrizione')

        if missing_fields:
            return jsonify({"error": f"Campi obbligatori mancanti o non validi: {', '.join(missing_fields)}"}), 400

        new_crime = {
            "_id": str(ObjectId()),
            "arresto": data['arresto'],
            "tipologia": data['tipologia'],
            "data": datetime.now(),
            "quartiere": data['quartiere'],
            "citta": data['citta'],
            "descrizione": data['descrizione'],
            "utente": utente
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

@app.route('/api/get_all', methods=['GET'])
def get_all_data():
    # Recupera tutti i documenti dalla collezione
    all_data = list(collection.find({}, {'_id': 0}))
    return jsonify(all_data)

@app.route('/api/getuser/<uid>', methods=['GET'])
def get_user(uid):
    print("Ricevuto ", uid)
    # Fetch user data
    userRecord = auth.get_user(uid)
    user = {
        "uid": userRecord.uid,
        "email": userRecord.email,
        "phoneNumber": userRecord.phone_number,
        "displayName": userRecord.display_name,
        "photoURL": userRecord.photo_url,
        "emailVerified": userRecord.email_verified,
        "disabled": userRecord.disabled,
        "metadata": {
            "creationTime": userRecord.user_metadata.creation_timestamp,
            "lastSignInTime": userRecord.user_metadata.last_sign_in_timestamp
        }
    }
    return jsonify(user)


@app.route('/api/get_user_posts/<user_id>', methods=['GET'])
def get_user_posts(user_id):
    # Recupera tutti i documenti dalla collezione
    all_data = list(collection.find({"utente.uid": user_id}, {'_id': 0}).sort("data", -1))
    return jsonify(all_data)

@app.route('/api/get_all_users', methods=['GET'])
def get_all_user():
    return jsonify(allusers)

@app.route('/api/sarch_users/<searchedUser>', methods=['GET'])
def search_user(searchedUser):
    result = list(filter(lambda searched: searchedUser.lower() in searched["displayName"].lower(), allusers)) 
    if len(result) > 0:
        return jsonify(result)
    else:
        return jsonify({"error": "Nessun utente trovato"})
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=41000, debug=True)