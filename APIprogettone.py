import pandas as pd 
import geopandas as gpd
import requests
from shapely.geometry import Point
import matplotlib.pyplot as plt
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
gf=gpd.read_file("Boundaries.geojson")
url = 'https://data.cityofchicago.org/resource/ijzp-q8t2.json'
response = requests.get(url)
df=pd.DataFrame(response.json())
#crea una colonna geometry conetente un point
df['geometry'] = df.apply(lambda row: Point(float(row['longitude']), float(row['latitude'])), axis=1)
#trasforma in geodataframe
crimes_gdf = gpd.GeoDataFrame(df, geometry='geometry', crs="EPSG:4326")
#ci assicuriamo che anche gf si a in 4326
gf = gf.to_crs("EPSG:4326")
# Join spaziale: associa ogni crimine al distretto in cui cade
joined_gdf = gpd.sjoin(crimes_gdf, gf, how="inner", predicate="within")
#Raggruppa per il distretto (usando 'index_right', che corrisponde all'indice del distretto) e conta i crimini
crime_counts = joined_gdf.groupby('index_right').size().reset_index(name='crime_count')
districts_gdf = gf.merge(crime_counts, left_index=True, right_on='index_right', how='left')

app = Flask(__name__)
CORS(app) 
@app.route('/all')
def fullcrime():
    return jsonify(joined_gdf.to_son())

@app.route('/crimecount')
def home():
    return jsonify(crime_counts.to_dict(orient="records"))

@app.route('/normal')
def normal():
    geojson_data = json.loads(gf.to_json())
    return jsonify(geojson_data)
@app.route('/gdf')
def gdf():
    geojson_data = json.loads(districts_gdf.to_json())  
    return jsonify(geojson_data)

if __name__ == '__main__':
    app.run(debug=True)