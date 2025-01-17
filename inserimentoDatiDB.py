import geopandas as gpd
import pandas as pd
from shapely.geometry import MultiPolygon, Polygon
from pymongo import MongoClient

def process_city_data(city_name, geojson_file, csv_file, json_file, mongo_db_name):
    # Caricamento dati
    quartieri = gpd.read_file(geojson_file)
    quartieri4326 = quartieri.to_crs("EPSG:4326")
    quartieri_csv = gpd.read_file(csv_file)
    reati_file = json_file
    df_reati = pd.read_json(reati_file)

    # Rinomina la colonna per il merge
    df_reati.rename(columns={'quartiere': 'NIL'}, inplace=True)

    # Unione dei dati
    reati_quartiere = quartieri_csv.merge(df_reati, on="NIL")
    conto_reati = reati_quartiere.groupby("NIL").size().reset_index(name='crime_count')
    finale = quartieri_csv.merge(conto_reati, on="NIL")
    file_finale = quartieri4326.merge(finale, on="NIL")

    # Rimozione colonne inutili
    file_finale.drop(columns=['Valido_dal_x', 'Valido_al_x', 'Fonte_x', 'Shape_Length_x', 'Shape_Area_x',
                              'OBJECTID_x', 'ID_NIL_y', 'Valido_dal_y', 'Valido_al_y', 'Fonte_y',
                              'Shape_Length_y', 'Shape_Area_y', 'OBJECTID_y',
                              'LONG_X_4326_CENTROID', 'LAT_Y_4326_CENTROID', 'Location'], inplace=True, errors='ignore')

    # Rinomina colonne
    file_finale.rename(columns={'NIL': 'pri_neigh'}, inplace=True)

    # Funzione per garantire geometrie come MultiPolygon
    def ensure_multipolygon(geometry):
        if isinstance(geometry, Polygon):
            return MultiPolygon([geometry])
        return geometry

    file_finale['geometry'] = file_finale['geometry'].apply(ensure_multipolygon)

    # Connessione a MongoDB
    uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
    client = MongoClient(uri)
    db = client["mappaUtenti"]
    collection = db[city_name]  # Usa il nome della città come nome della collezione

    # Creazione del payload per MongoDB
    data_to_insert = []

    for _, row in file_finale.iterrows():
        data = {
            "id": row.name,  # Usa l'indice come ID
            "città": city_name,
            "geometry": row.geometry.__geo_interface__,
            "quartiere": row['pri_neigh'],
            "numero_crimini": row['crime_count']
        }
        data_to_insert.append(data)

    # Inserimento nel database
    collection.insert_many(data_to_insert)

    print(f"Dati della città {city_name} inseriti con successo nel database MongoDB nella collezione '{city_name}'.")

# Esempio di utilizzo
process_city_data("Milano", "ds964_nil_wm.geojson", "ds964_nil_wm_4326.csv", "reati_milano_100.json", "CityDB")
