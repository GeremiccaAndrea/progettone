import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import Point
from pymongo import MongoClient
from datetime import datetime

def get_crime_data():
    """
    Scarica i dati dei crimini da Chicago Open Data.
    """
    url = "https://data.cityofchicago.org/resource/ijzp-q8t2.json"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception("Errore nel recupero dei dati dei crimini")

def find_neighborhood_for_crime(crime_data, neighborhoods_geojson):
    """
    Determina in quale quartiere di Chicago si trova un crimine basandosi sulla sua posizione.
    
    :param crime_data: Lista di dizionari contenente i dettagli dei crimini, inclusi 'latitude' e 'longitude'.
    :param neighborhoods_geojson: Percorso al file GeoJSON con i confini dei quartieri di Chicago.
    :return: DataFrame con i crimini e i quartieri corrispondenti.
    """
    
    # Caricamento dei quartieri
    neighborhoods = gpd.read_file("Boundaries.geojson")
    
    # Creazione del DataFrame dei crimini
    crime_df = pd.DataFrame(crime_data)
    crime_df = crime_df.dropna(subset=["latitude", "longitude"])
    crime_df["latitude"] = crime_df["latitude"].astype(float)
    crime_df["longitude"] = crime_df["longitude"].astype(float)
    
    # Creazione della colonna geometria
    crime_gdf = gpd.GeoDataFrame(crime_df, geometry=gpd.points_from_xy(crime_df.longitude, crime_df.latitude), crs="EPSG:4326")
    
    # Join spaziale con i quartieri
    crime_gdf = gpd.sjoin(crime_gdf, neighborhoods, how="left", predicate="within")

    # Converti la colonna "date" in formato datetime
    crime_gdf["date"] = pd.to_datetime(crime_gdf["date"], errors="coerce")
    
    # Rinominare i campi per corrispondere allo schema richiesto
    crime_gdf["id"] = crime_gdf.index
    crime_gdf["arresto"] = crime_gdf.get("arrest", False)
    crime_gdf["tipologia"] = crime_gdf.get("primary_type", "Sconosciuto")
    crime_gdf["data"] = crime_gdf.get("date", None)
    crime_gdf["quartiere"] = crime_gdf.get("pri_neigh", None)
    crime_gdf["citta"] = "Chicago"
    
    return crime_gdf[["id", "arresto", "tipologia", "data", "quartiere", "citta"]] 

def insert_into_mongo(crime_data, db_name="mappaUtenti", collection_name="Crimini"):
    """
    Inserisce i dati nel database MongoDB.
    
    :param crime_data: DataFrame con i dati dei crimini e i quartieri associati.
    :param db_name: Nome del database MongoDB.
    :param collection_name: Nome della collezione.
    """
    uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
    client = MongoClient(uri)
    db = client[db_name]
    collection = db[collection_name]
    
    # Convertire il DataFrame in un dizionario e caricare su MongoDB
    records = crime_data.to_dict(orient="records")
    collection.insert_many(records)
    print(f"Inseriti {len(records)} documenti nella collezione {collection_name} del database {db_name}.")


# Esempio di utilizzo
neighborhoods_file = "Boundaries.geojson"
crime_data = get_crime_data()
crime_with_neighborhoods = find_neighborhood_for_crime(crime_data, neighborhoods_file)
insert_into_mongo(crime_with_neighborhoods)
