from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from bson.json_util import dumps
import json
from datetime import datetime, timedelta
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point,shape

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
        documenti = list(collection.find({"città": cityName}))
        df_crimini=pd.DataFrame(recent_crimes)
        gdf_quartieri = gpd.GeoDataFrame(documenti)

        gdf_quartieri["geometry"] = gdf_quartieri["geometry"].apply(lambda g: shape(g) if isinstance(g, dict) else g)

        GroupDocumenti=pd.merge(df_crimini, gdf_quartieri, on='quartiere', how='inner').reset_index()
      
        print(GroupDocumenti)
        crimini_per_quartiere = GroupDocumenti.groupby('quartiere')['id_y'].count()
        gdf_quartieri["numero_crimini"] = gdf_quartieri["quartiere"].map(crimini_per_quartiere).fillna(0)
        # Creazione del GeoJSON
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": quartiere['geometry'].__geo_interface__,  # Assicura che la geometria sia ben formattata
                    "properties": {
                        "quartiere": quartiere["quartiere"],
                        "numero_crimini": quartiere["numero_crimini"],
                        "citta": quartiere["città"]
                    }
                }
                for _, quartiere in gdf_quartieri.iterrows()  # Itera sulle righe del GeoDataFrame
            ]
        }
        return jsonify(geojson)
    else:
        return jsonify({"error": "City not found"}), 404

@app.route('/GetDataCrimes/<cityName>/<quartiere>')
def getDataCrimes(cityName, quartiere):
    cityName = cityName.capitalize()
    if cityName == "Milano":
        quartiere = quartiere.upper()
    elif cityName == "Chicago":
        quartiere = quartiere.capitalize()

    collection = db["Crimini"]
    # Recupera le città disponibili nel database
    ListaCittà = collection.distinct("citta")

    if cityName in ListaCittà:
        query = {
            "citta": cityName,
            "quartiere": quartiere
        }
        fields = {
            "_id": 0,  # Esclude l'ID MongoDB
            "arresto": 1,
            "data": 1,
            "tipologia": 1
        }

        # Esegui la query sul database
        risultati = list(collection.find(query, fields))

        return jsonify(risultati)
    else:
        return jsonify({"errore": "Città non trovata nel database"}), 404

if __name__ == '__main__':
    app.run(debug=True)
