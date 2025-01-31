import pandas as pd
from pymongo import MongoClient
import json
import requests

def insert_crime_data(city_name, crime_file, crime_url):
    """
    Inserisce i dati dei crimini nel database MongoDB.
    
    :param city_name: Nome della città (string)
    :param crime_file: Percorso al file CSV/JSON contenente i dati dei crimini
    :param mongo_db_name: Nome del database MongoDB
    """
    # Caricamento dati
    if crime_file.endswith('.csv'):
        df = pd.read_csv(crime_file)
    elif crime_file.endswith('.json'):
        df = pd.read_json(crime_file)
    elif not crime_file:
        x=requests.get(crime_url)
        df = pd.DataFrame(x.json())
    else:
        raise ValueError("Formato file non supportato!")
    
    # Creazione del DataFrame con i campi richiesti
    df_crimes = df[["arrest", "primary_type", "date"]].copy()

    # Connessione a MongoDB
    uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
    client = MongoClient(uri)
    db = client["mappaUtenti"]
    collection = db["crimini"]  # Nome collezione basato sulla città

    # Creazione del payload per MongoDB
    data_to_insert = []
    
    for index, row in df_crimes.iterrows():
        data = {
            "id": index,  # Usa l'indice come ID
            "arresto": row.get("arrest", False),  # Default False se il campo non esiste
            "tipologia": row.get("primary_type", "Sconosciuto"),  # Default "Sconosciuto"
            "data": row.get("date", ""),
            "citta": city_name.capitalize()
        }
        data_to_insert.append(data)

    # Inserimento nel database
    collection.insert_many(data_to_insert)
    print(f"Dati dei crimini per {city_name} inseriti con successo nella collezione crimini.")

# Esempio di utilizzo
insert_crime_data("Chicago", "", "https://data.cityofchicago.org/resource/ijzp-q8t2.json")