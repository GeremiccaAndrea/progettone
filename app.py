from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from bson.json_util import dumps
import json

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
    if cityName in map(str.capitalize, db.list_collection_names()):
        collection = db[cityName]
        documenti = list(collection.find())
        
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
