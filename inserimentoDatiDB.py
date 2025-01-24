import geopandas as gpd
import pandas as pd
from shapely.geometry import MultiPolygon, Polygon, Point
from pymongo import MongoClient
import requests

def process_city_data(city_name, geojson_file, json_file, url_json, mongo_db_name):
    # Caricamento dati
    quartieri = gpd.read_file(geojson_file)
    quartieri4326 = quartieri.to_crs("EPSG:4326")
    reati_file = json_file
    if reati_file:
        df_reati = pd.read_json(reati_file)
    else:
        x=requests.get(url_json)
        df_reati = pd.DataFrame(x.json())

    # Rinomina la colonna per il merge
    df_reati.rename(columns={'quartiere': 'NIL'}, inplace=True)

    # Unione dei dati
    #crea una colonna geometry conetente un point
    df_reati['geometry'] = df_reati.apply(lambda row: Point(float(row['longitude']), float(row['latitude'])), axis=1)
    #trasforma in geodataframe
    crimes_gdf = gpd.GeoDataFrame(df_reati, geometry='geometry', crs="EPSG:4326")
    #ci assicuriamo che anche gf si a in 4326
    quartieri = quartieri.to_crs("EPSG:4326")
    # Join spaziale: associa ogni crimine al distretto in cui cade
    joined_gdf = gpd.sjoin(crimes_gdf, quartieri, how="inner", predicate="within")
    #Raggruppa per il distretto (usando 'index_right', che corrisponde all'indice del distretto) e conta i crimini
    crime_counts = joined_gdf.groupby('index_right').size().reset_index(name='crime_count')
    districts_gdf = quartieri.merge(crime_counts, left_index=True, right_on='index_right', how='left').reset_index()

    # Rimozione colonne inutili
    districts_gdf.drop(columns=['Valido_dal_x', 'Valido_al_x', 'Fonte_x', 'Shape_Length_x', 'Shape_Area_x',
                              'OBJECTID_x', 'ID_NIL_y', 'Valido_dal_y', 'Valido_al_y', 'Fonte_y',
                              'Shape_Length_y', 'Shape_Area_y', 'OBJECTID_y',
                              'LONG_X_4326_CENTROID', 'LAT_Y_4326_CENTROID', 'Location'], inplace=True, errors='ignore')

    # Rinomina colonne
    try:
        districts_gdf.rename(columns={'NIL': 'pri_neigh'}, inplace=True)
    except e:
        print(e)

    # Funzione per garantire geometrie come MultiPolygon
    def ensure_multipolygon(geometry):
        if isinstance(geometry, Polygon):
            return MultiPolygon([geometry])
        return geometry

    districts_gdf['geometry'] = districts_gdf['geometry'].apply(ensure_multipolygon)
    #cambio il tipo di dato di due colonne
    districts_gdf['crime_count'] = districts_gdf['crime_count'].fillna(0).astype('int32')
    districts_gdf['index'] = districts_gdf['index'].fillna(0).astype('int32')

    # Connessione a MongoDB
    uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
    client = MongoClient(uri)
    db = client["mappaUtenti"]
    collection = db[city_name]  # Usa il nome della città come nome della collezione

    # Creazione del payload per MongoDB
    data_to_insert = []

    for _, row in districts_gdf.iterrows():
        data = {
            "id": row['index'],  # Usa l'indice come ID
            "città": city_name,
            "geometry": row.geometry.__geo_interface__,
            "quartiere": row['pri_neigh'],
            "numero_crimini": row['crime_count']
        }
        data_to_insert.append(data)

    # Inserimento nel database
    collection.insert_many(data_to_insert)

    print(f"Dati della città {city_name} inseriti con successo nel database MongoDB nella collezione '{city_name}'.")

#process_city_data("Milano", "ds964_nil_wm.geojson", "reati_milano_100.json", "", "CityDB")

#Chicago
process_city_data("Chicago", "Boundaries.geojson", "", "https://data.cityofchicago.org/resource/ijzp-q8t2.json", "CityDB")