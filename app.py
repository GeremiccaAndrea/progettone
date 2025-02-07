from flask import Flask, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from bson.json_util import dumps
import json
from datetime import datetime, timedelta
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

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

        crimini_data = pd.DataFrame(recent_crimes)
        geometry = [Point(lon, lat) for lon, lat in zip(crimini_data['lon'], crimini_data['lat'])]
        crimini_gdf = gpd.GeoDataFrame(crimini_data, geometry=geometry)
        crimini_gdf['data'] = pd.to_datetime(crimini_gdf['data'], unit='ms')
        crimini_gdf.set_crs("EPSG:4326", allow_override=True, inplace=True)

        quartieri_gdf = gpd.read_file(documenti)
        crimini_per_quartiere = gpd.sjoin(crimini_gdf, quartieri_gdf, how="inner", op="within")
        crimini_count = crimini_per_quartiere.groupby('quartiere')['id'].count()
        quartieri_gdf['numero_crimini'] = quartieri_gdf['quartiere'].map(crimini_count)

        # Creazione del GeoJSON
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": quartiere['geometry'].__geo_interface__,
                    "properties": {key: value for key, value in quartiere.items() if key not in ["_id", "geometry"]}
                }
                for idx, quartiere in quartieri_gdf.iterrows()
            ]
        }
        return jsonify(geojson)
    else:
        return jsonify({"error": "City not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)
