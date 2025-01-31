from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from bson.json_util import dumps
import json
from datetime import datetime, timedelta

# Configurazione del database MongoDB
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri)
db = client["mappaUtenti"]

# Configurazione Flask
app = Flask(__name__)
CORS(app)

@app.route('/GetCity/<cityName>')
def getCity(cityName):
    cityName = cityName.capitalize()
    collection = db["Geometry"]
    ListaCittà= collection.distinct("città")
    collectionCrimini=db["crimini"]
    #trovo la data di oggi
    today = datetime.utcnow()
    ten_years_ago = today - timedelta(days=10*365)  # Circa 10 anni
    print(ten_years_ago)
    query = {
        "citta": cityName,
        "data": {"$gte": ten_years_ago.isoformat()}  # Confronto con la stringa ISO 8601
    }
    recent_crimes = list(collection.find(query))
    return jsonify(recent_crimes)
    if cityName in ListaCittà:
        documenti = list(collection.find({"città": cityName}))
        
        # Creazione del GeoJSON
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": doc.get("geometry", {}),
                    "properties": {key: value for key, value in doc.items() if key not in ["_id", "geometry"]}
                }
                for doc in documenti
            ]
        }
        return jsonify(geojson)
    else:
        return jsonify({"error": "City not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)
