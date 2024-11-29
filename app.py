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

#dati_Milano
quartieriMilano2 = gpd.read_file("ds964_nil_wm.geojson")
quartieriMilano4326 = quartieriMilano2.to_crs("EPSG:4326")
quartieriMilano = gpd.read_file('ds964_nil_wm_4326.csv')
reatiMilano = 'reati_milano_100.json'
dfReatiMilano = pd.read_json(reatiMilano)
dfReatiMilano.rename(columns={'quartiere': 'NIL'}, inplace=True)
reatiQuartiere = quartieriMilano.merge(dfReatiMilano, on = "NIL")
contoReati = reatiQuartiere.groupby("NIL").size().reset_index(name='crime_count')
finaleMilano = quartieriMilano.merge(contoReati, on = "NIL")

    
app = Flask(__name__)
CORS(app) 
@app.route('/all')
def fullcrime():
    return jsonify(joined_gdf.to_json())

@app.route('/crimecount')
def home():
    return jsonify(crime_counts.to_dict(orient="records"))

@app.route('/crimecountMilano')
def crimecountMilano():
    return jsonify(contoReati.to_dict(orient="records"))

@app.route('/normal')
def normal():
    geojson_data = json.loads(gf.to_json())
    return jsonify(geojson_data)

@app.route('/M')
def m():
    geojson_data = json.loads(quartieriMilano2.to_json())
    return jsonify(geojson_data)

@app.route('/gdf')
def gdf():
    geojson_data = json.loads(districts_gdf.to_json())  
    return jsonify(geojson_data)

@app.route('/gdfMilano')
def gdfMilano():
    geojson_data = json.loads(finaleMilano.to_json()) 
     # Unisce i dati per ID
    unified_data = [
        {
            "Fonte": geojson_data["Fonte"].get(key),
            "ID_NIL": geojson_data["ID_NIL"].get(key),
            "LAT_Y_4326_CENTROID": geojson_data["LAT_Y_4326_CENTROID"].get(key),
            "LONG_X_4326_CENTROID": geojson_data["LONG_X_4326_CENTROID"].get(key),
            "Location": geojson_data["Location"].get(key),
            "NIL": geojson_data["NIL"].get(key),
            "OBJECTID": geojson_data["OBJECTID"].get(key),
            "Shape_Area": geojson_data["Shape_Area"].get(key),
            "Shape_Length": geojson_data["Shape_Length"].get(key),
            "Valido_al": geojson_data["Valido_al"].get(key),
            "Valido_dal": geojson_data["Valido_dal"].get(key),
            "crime_count": geojson_data["crime_count"].get(key)
        }
        for key in geojson_data["Fonte"].keys()  # Itera su tutte le chiavi di "Fonte"
    ]
    return jsonify(unified_data)

@app.route('/criminiOnClick/<NomeNeigh>')
def criminiOnClick(NomeNeigh):
    
    OnClick=joined_gdf[joined_gdf["pri_neigh"]==NomeNeigh][["id","arrest","case_number","date","description","domestic"]]
    geojson_data = json.loads(OnClick.to_json())  
    return jsonify(geojson_data)
    

if __name__ == '__main__':
    app.run(debug=True)
