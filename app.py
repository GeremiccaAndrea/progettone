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
    collectionCrimini=db["Crimini"]
   
    if cityName in ListaCittà:
        # Query for crimes in the last 10 years
        today = datetime.utcnow()
        ten_years_ago = today - timedelta(days=10*365)
# Ensure it's in UTC (important to match MongoDB's UTC)
        ten_years_ago = ten_years_ago.replace(tzinfo=None)

        # Debugging output
        print(f"Using test_date: {ten_years_ago} (UTC)")

        # MongoDB query with case-insensitive search for city and date filter
        query = {
            "citta": {"$regex": f"^{cityName}$", "$options": "i"},  # Case-insensitive match
            "data": {"$gte": ten_years_ago}  # Comparing to test_date (in UTC)
        }
        # Fetching documents
        recent_crimes = list(collectionCrimini.find(query))
        if recent_crimes:
            return jsonify(json.loads(dumps(recent_crimes, default=str)))
        else:
            return jsonify({"message": f"No recent crimes found in {cityName}"}), 404

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
